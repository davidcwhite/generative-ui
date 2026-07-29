# Stacked bar radius diagnostics

Use this note when a rounded cap appears inside a stacked bar, disappears from
some buckets, or no longer joins cleanly to the segment beneath it.

This is normally **not a CSS border-radius bug**. In Recharts, `radius` on
`<Bar>` belongs to one series. The visible top of a stack belongs to one data
point. Those are different things whenever buckets are sparse.

## Fast diagnosis

First find where the radius is assigned:

```tsx
{keys.map((key, index) => (
  <Bar
    key={key}
    dataKey={key}
    stackId="volume"
    radius={index === keys.length - 1 ? [3, 3, 0, 0] : 0}
  />
))}
```

This code rounds the **last declared series**. It does not ask which series is
the visible top in each bucket.

Then compare the symptom:

| Symptom | Most likely cause |
| --- | --- |
| The same internal band is rounded in every bucket | Radius is on the wrong `<Bar>`, or `reverseStackOrder` changed the visual order |
| Only sparse buckets lose or misplace the cap | The designated top series is `0`, `null`, `undefined` or omitted in those buckets |
| Every join is curved or notched | Radius was applied to every series |
| The problem moves after filtering or sorting | Rendered key order and radius-selection order no longer match; index keys or stale memoisation can contribute |
| It is wrong only during the transition | Series keys/order changed between animation frames |
| A very small top segment looks pinched or detached | Radius is too large for its rendered height, possibly amplified by `minPointSize` |

Log the effective top for each row:

```ts
function effectiveTop(row: Record<string, unknown>, orderedKeys: string[]) {
  return [...orderedKeys].reverse().find((key) => {
    const value = Number(row[key]);
    return Number.isFinite(value) && value > 0;
  });
}

console.table(
  data.map((row) => ({
    bucket: row.bucket,
    expectedTop: effectiveTop(row, keys),
    values: keys.map((key) => `${key}:${row[key]}`).join(", "),
  })),
);
```

If `expectedTop` changes between rows, a radius attached to one `<Bar>` cannot
be correct for every row.

## Primary cause: series order is not per-bucket topology

Consider three series rendered in this order:

| Bucket | Financials | Autos | Utilities | Visible top |
| --- | ---: | ---: | ---: | --- |
| Jan | 8 | 5 | 2 | Utilities |
| Feb | 8 | 5 | 0 | Autos |
| Mar | 8 | 0 | 3 | Utilities |

Applying `[3, 3, 0, 0]` to `Utilities` works in January and March. In February,
Utilities has no visible rectangle, so Autos becomes the real top but remains
square. If the radius was attached to Autos instead, February would look right
while the curved Autos segment would sit inside January's stack.

The usual mistakes are:

1. assuming the first or last key is always visually top;
2. deriving the rounded key from category rank rather than render order;
3. applying radius to all `<Bar>` children;
4. filtering the data without rebuilding the category order;
5. using `reverseStackOrder` while leaving the radius rule unchanged;
6. treating zero, missing and non-finite values as visible segments.

## Recommended fix: round the stack, not a series

Recharts 3.6 introduced `BarStack`. Its radius applies to the outer stack as a
single shape, so omitted and short edge segments do not move a rounded corner
into the middle.

```tsx
import { Bar, BarChart, BarStack } from "recharts";

<BarChart data={data}>
  <BarStack stackId="volume" radius={[3, 3, 0, 0]}>
    {categories.map((category) => (
      <Bar
        key={category.key}
        dataKey={category.key}
        fill={category.fill}
        maxBarSize={40}
      />
    ))}
  </BarStack>
</BarChart>;
```

Important:

- remove the individual `radius` prop from the child bars; otherwise internal
  segments can still curve;
- let `BarStack` own `stackId`, rather than generating a different ID per bar;
- `[top-left, top-right, bottom-right, bottom-left]` is the corner order for a
  vertical, positive-only stack;
- confirm the **installed** version, not only `package.json`:

```bash
npm ls recharts
```

If the project resolves Recharts below 3.6, `BarStack` is unavailable.

## Fallback for older Recharts

For an older version, calculate the effective top per row and override each
cell. The `Cell` list must use the same row order as the chart data.

```tsx
import { Bar, Cell } from "recharts";

const plotted = data.map((row) => ({
  ...row,
  __topKey: effectiveTop(row, keys),
}));

{keys.map((key) => (
  <Bar key={key} dataKey={key} stackId="volume" fill={colourFor(key)}>
    {plotted.map((row) => (
      <Cell
        key={`${row.bucket}-${key}`}
        radius={row.__topKey === key ? [3, 3, 0, 0] : 0}
      />
    ))}
  </Bar>
))}
```

Use stable bucket-and-series keys. Index keys can bind an old radius to a new
row after sorting or filtering.

If the Recharts version's `Cell` typings do not expose `radius`, use a custom
`shape` that renders `<Rectangle>` and chooses the radius from
`props.payload.__topKey`. The decision must still be per datum, not per series.

## Checks that often reveal the real bug

### 1. Verify one canonical key order

Use the same `categories` array for:

- the `<Bar>` render order;
- colour assignment;
- legend order;
- tooltip ranking;
- any fallback radius calculation.

Do not sort that array in place:

```ts
// Bad: mutates the order another memo may already be using.
categories.sort((a, b) => b.volume - a.volume);

// Good: creates the one explicit order used for this render.
const orderedCategories = [...categories].sort(
  (a, b) => b.volume - a.volume,
);
```

### 2. Normalise missing values

Make each plotted key numeric:

```ts
const value = Number(raw[key]);
point[key] = Number.isFinite(value) ? value : 0;
```

`undefined`, `null`, `NaN` and omitted properties can take different paths
through data preparation, tooltip filtering and SVG layout. Normalising them
removes ambiguity.

### 3. Inspect `reverseStackOrder`

`reverseStackOrder` changes SVG render order without changing the input data.
Any “last key is top” rule must account for it. Prefer `BarStack`, which avoids
making corner ownership depend on child order.

### 4. Remove `minPointSize` while diagnosing

In a stack, `minPointSize` can make a tiny value taller than its proportional
geometry. Several forced minimums may overlap or make the cap look detached.
Recharts also cautions that minimum point sizes are unreliable for tightly
packed stacks. Test with it removed before changing radius logic.

### 5. Distinguish persistent and transitional faults

Disable animation temporarily:

```tsx
<Bar isAnimationActive={false} />
```

If the final frame is correct, the problem is series identity during
interpolation. Keep stable `dataKey` and React `key` values, and do not reorder
series while old data is still mounted. If the final frame is wrong, animation
is not the cause.

### 6. Check stroke and radius size

While diagnosing, set:

```tsx
<Bar stroke="none" radius={[3, 3, 0, 0]} />
```

A contrasting stroke can expose seams between otherwise correct segments.
Also keep the radius no larger than roughly half the smallest expected cap
height, or use `BarStack`, which clips the outside of the combined stack.

## Mixed-sign and horizontal stacks

The examples above assume positive values in a vertical chart.

- A mixed-sign stack has two outer edges: the top of the positive stack and the
  bottom of the negative stack. A single per-series top rule is insufficient.
- A horizontal positive stack normally rounds the right corners:
  `[0, 3, 3, 0]`.
- A reversed axis changes which physical edge is outer.

Use stack-level rounding where possible, then test the actual axis direction
and sign combinations.

## Verification matrix

Do not approve the fix using only dense demo data. Test:

- every series has a value;
- the final declared series is zero;
- two trailing series are zero;
- only one series has a value;
- a top segment is smaller than twice the radius;
- the data is filtered and re-sorted;
- the stack dimension changes;
- animation is on and off;
- any supported negative values;
- horizontal or reversed axes, if used.

The invariant is simple: **only the outside edge of each complete stack is
rounded; every internal join stays square.**

## References

- [Recharts: rounded bar corners](https://recharts.github.io/en-US/guide/roundedBars/)
- [Recharts `BarStack` API](https://recharts.github.io/en-US/api/BarStack/)


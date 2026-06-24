# Bond Issuance Generated-UI Components — Implementation Plan

> Branch: `lab/bond-issuance-generated-ui-components`
> Stack: React 18.3 · TypeScript 5.6 · Vite 5.4 · Tailwind v4 · Recharts 3.7
> Lab home: `client/src/lab/issuance-components/`

## 1. Goal & Scope

Build a set of **generated-UI components** for the bond-issuance (DCM) domain: structured, domain-specific responses a model can emit instead of prose. Each component is a self-contained card that hydrates progressively ("writes itself in") on top of mock data, reusing the existing lab engine (`useHydration`, `Hydrate`, `SkeletonText`).

The deliverable is **7 components** grounded in real DCM banker workflows (syndicate desk, origination, DCM coverage), each with a typed data contract, defined UX, and a registry entry so a generated response can name a component + payload.

In scope:
- Component UX, layout, charts, hydration, and accessibility.
- Typed data contracts (mock data only — nothing hits the network).
- A lightweight component registry mapping `kind -> component` for generated responses.
- A lab harness to preview all components with progressive/instant + replay.

Out of scope (for this phase): live data feeds, real model wiring, persistence, theming beyond the existing stone palette.

## 2. The Component Set (confirmed)

| # | Component | DCM purpose | Replaces / status |
|---|-----------|-------------|-------------------|
| 1 | `IssuanceWindow` | Is the primary market open? Rates/vol/spread backdrop + go/no-go read | renamed from "MarketPulse"; new |
| 2 | `DealSnapshot` | Single-deal tear sheet: terms, book coverage, status | exists — refine to contract |
| 3 | `NewIssueTermsMonitor` | Price progression IPT → guidance → launch → priced; NIC, tightening | new |
| 4 | `CrossCurrencyRelativeValue` | Where is it cheapest to fund? USD/EUR/GBP incl. SOFR/€STR/SONIA basis | new |
| 5 | `PeerAnalysis` | Issuer vs comparables: outstanding curve + secondary liquidity/traded | new |
| 6 | `AllocationSummary` | Book breakdown by investor type, geography, quality + hit rate | exists (basic) — **expand** |
| 7 | `SecondaryPerformance` | Post-pricing performance vs reoffer (price/spread, break) | exists — refine to contract |

"Live Bookbuild" was dropped (not data-feasible as a generated artifact). Cross-currency, peer, and macro reads are folded into #1, #4, #5 per the DCM-workflow research.

## 3. Design Principles (from the loaded skills)

These are the binding rules for every component. They distill the **Web Interface Guidelines**, **Vercel React Best Practices**, and **Composition Patterns** skills into this project's context.

### 3.1 Accessibility & semantics (Web Interface Guidelines)
- Use semantic HTML first: `dl/dt/dd` for term lists, `table` for tabular data, `h3` per card title, `figure/figcaption` for charts.
- Icon-only controls (replay, expand, info) need `aria-label`; decorative icons get `aria-hidden="true"`.
- Every interactive element has a visible `focus-visible:ring-*`; never `outline-none` without a replacement.
- Tabs/segmented controls use real `button`s with `aria-pressed` (the harness toggle already does this) or `role="tablist"` semantics.
- Charts are not keyboard-traps: pair each chart with a `figcaption` / sr-only summary table or `aria-label` describing the headline so non-visual users get the number.
- Respect `prefers-reduced-motion`: hydration build-in and bar/line draw-in must collapse to instant. Add a global reduced-motion guard in `index.css`.

### 3.2 Typography & number formatting
- `font-variant-numeric: tabular-nums` (`tabular-nums`) on every numeric column, KPI, and comparison so digits don't jitter during hydration.
- Format with `Intl.NumberFormat` / `Intl.DateTimeFormat` — no hardcoded currency/date strings. Centralize formatters (e.g. `fmtBps`, `fmtCcyMm`, `fmtPct`, `fmtDate`) in a `format.ts` helper.
- Use `…` not `...`; curly quotes; non-breaking spaces in units (`88 bps`, `€1.25 bn`).
- `text-pretty`/`text-balance` on multi-line titles to avoid widows.

### 3.3 Content handling & empty states
- Every text slot must survive short / long / missing values: `truncate` or `line-clamp-*`, with `min-w-0` on flex children.
- Define an explicit empty/partial state per component (e.g. deal not yet priced → show "Pending" not a broken `+undefined bps`). Generated payloads will be incomplete; components must degrade gracefully.

### 3.4 Performance (React Best Practices)
- Derive state during render, not in effects (`rerender-derived-state-no-effect`) — e.g. coverage %, tightening deltas.
- Hoist static config (column defs, `TERMS`, chart series defs) to module scope (`rendering-hoist-jsx`, `architecture` cleanliness). The existing `DealSnapshot.TERMS` is the model.
- `useCallback` for handlers passed to children; functional `setState` for replay/runId (already done in the harness).
- Charts: reduce SVG coordinate precision, keep series small; no list >50 rows without `content-visibility`/virtualization (peer/allocation tables stay short by design).
- Use refs for transient values (drag/scroll); no layout reads in render.

### 3.5 Composition (Composition Patterns)
- **No boolean-prop proliferation.** Components take a typed data object + the shared hydration props (`mode`, `runId`, `delay`), never `isExpanded`/`isCompact`/`showChart` flags. Variants that differ structurally become explicit components.
- Build shared primitives as **compound components** with context where there's real shared state (e.g. `<Card>`/`<Card.Header>`/`<Card.Metric>`), otherwise plain composition via `children`.
- Prefer `children` over `renderX` props.
- React 18 here, so **skip React 19-only patterns** (`use()`, dropping `forwardRef`). Primitives that forward refs use `forwardRef` normally.

### 3.6 Shared visual language
- Card shell: `rounded-2xl border border-stone-200 bg-white p-5 shadow-sm` (matches existing).
- Palette: stone neutrals; emerald = tightening/positive, rose/amber = widening/caution, blue/violet for chart categoricals (reuse `currencyMix` colors).
- Eyebrow label: `text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400`.
- Hydration phases drive reveal: `frame → scaffold → labels → data → done`. Labels resolve at `atLeast('labels')`, numbers/charts at `atLeast('data')`.

## 4. Component Specifications

Each spec lists: **why a banker asks for it**, the **layout/UX**, the **data contract** (TS), the **hydration map**, and **a11y notes**. Data contracts are additive to `issuanceData.ts` (new file `issuanceData2.ts` or split per-domain — see §5).

### 4.1 `IssuanceWindow`
*Origination/syndicate: "Is the window open today?" — the macro/rates/vol backdrop that decides go/no-go.*

**Layout**
- Header: eyebrow "Issuance Window", title with a single **read** chip: `Open` (emerald) / `Selective` (amber) / `Shut` (rose).
- Condition strip — 3–4 mini gauges: rates level (e.g. 10Y UST/Bund), volatility (VIX/MOVE), credit spreads (IG/HY index), and expected supply today.
- A 10-session sparkline of a "window score" with the latest point emphasized.
- One-line rationale ("Rates stable, MOVE < 90, IG +2 bps — constructive for IG supply").

**Data contract**
```ts
type WindowRead = 'open' | 'selective' | 'shut';
interface WindowGauge {
  id: string;
  label: string;        // "MOVE", "10Y UST", "IG OAS"
  value: string;        // formatted, tabular-nums
  delta: string;        // "-3 bps", "+0.4"
  trend: Trend;         // reuse existing Trend
  tone: 'good' | 'watch' | 'bad';
}
interface IssuanceWindowData {
  read: WindowRead;
  asOf: string;         // ISO; rendered via Intl.DateTimeFormat
  rationale: string;
  gauges: WindowGauge[];     // 3–4
  scoreSeries: number[];     // ~10 sessions for sparkline
}
```
**Hydration** — labels: eyebrow/title/gauge labels. data: read chip, gauge values, sparkline draw-in.
**A11y** — read chip carries text (not color-only); sparkline gets `aria-label` summarizing trend; gauges in a `dl`.

### 4.2 `DealSnapshot` (refine existing)
*The single-deal tear sheet syndicate sends round: terms + book quality at a glance.*

**Changes vs current** — keep the term grid + coverage bar; (a) move data to the typed contract below, (b) add a status that supports the full lifecycle (`announced → guidance → launched → priced`), (c) tabular-nums on all numbers, (d) graceful "Pending" for unset spreads pre-pricing.

**Data contract** — formalize the existing `DealSnapshotData` (already in `issuanceData.ts`), add:
```ts
type DealStatus = 'announced' | 'guidance' | 'launched' | 'priced';
// extend DealSnapshotData with: status: DealStatus; (finalSpreadBps becomes optional until priced)
```
**Hydration** — already implemented (labels → data). Keep.
**A11y** — status chip text-labeled; `dl` term grid is correct; coverage bar gets `role="progressbar"` + `aria-valuenow`.

### 4.3 `NewIssueTermsMonitor`
*Syndicate: track the deal's price journey and how much it tightened — the core "how did pricing go" artifact.*

**Layout**
- Header: bond name + current stage stepper (`IPT · Guidance · Launch · Priced`), current stage emphasized.
- Big metric: final/launch spread with the **tightening from IPT** as the hero delta (e.g. `+88 bps  ▼ 12 from IPT`).
- Horizontal range bar showing IPT band → guidance band → launch/priced point, so the move is visual.
- Secondary metrics row: NIC (bps), book at launch (x covered), price progression count.

**Data contract**
```ts
interface PriceStage {
  stage: 'ipt' | 'guidance' | 'launch' | 'priced';
  label: string;          // "IPT", "Guidance"
  lowBps?: number;        // band low (IPT/guidance)
  highBps?: number;       // band high
  pointBps?: number;      // single point (launch/priced)
  at?: string;            // ISO timestamp
}
interface NewIssueTermsData {
  bondName: string;
  benchmark: string;          // "vs MS", "vs Gilts", "vs UST"
  stages: PriceStage[];       // ordered
  currentStage: PriceStage['stage'];
  tighteningBps: number;      // IPT point/mid minus priced
  newIssueConcessionBps: number | null;
  bookCoverageAtLaunch: number;
}
```
**Hydration** — labels: stepper + metric labels. data: spreads, range bar fill, deltas.
**A11y** — stepper is an ordered list with `aria-current="step"`; range bar has an sr-only summary ("IPT 100 area, priced +88, 12 bps tighter").

### 4.4 `CrossCurrencyRelativeValue`
*Origination: "Which currency is cheapest to issue in after the basis swap?" USD vs EUR vs GBP, swapped back to the issuer's home leg.*

**Layout**
- Header: issuer + target tenor (e.g. "5Y funding").
- Comparison table (3–4 rows, one per currency): nominal coupon/spread, reference base (`SOFR` / `€STR` / `SONIA`), cross-currency basis adj (bps), and **all-in cost** swapped to home currency. Highlight the cheapest all-in row.
- Small horizontal bar of all-in cost per currency for instant visual ranking.

**Data contract**
```ts
interface FundingLeg {
  currency: string;            // "USD", "EUR", "GBP"
  refRate: 'SOFR' | '€STR' | 'SONIA' | 'EURIBOR';
  newIssueSpreadBps: number;   // vs the swap/govvie reference
  xccyBasisBps: number;        // basis adjustment to home leg
  allInBps: number;            // swapped-back all-in cost (home ccy)
}
interface CrossCurrencyRVData {
  issuer: string;
  homeCurrency: string;        // leg everything is swapped back to
  tenor: string;               // "5Y"
  legs: FundingLeg[];          // 3–4, cheapest flagged by min(allInBps)
}
```
**Hydration** — labels: column headers + currency rows. data: numbers + bar widths + cheapest highlight.
**A11y** — real `table` with `scope="col"`/`scope="row"`; cheapest row marked with text ("Cheapest") + visual, not color alone. Reference-rate tokens wrapped `translate="no"`.

### 4.5 `PeerAnalysis`
*DCM coverage: where does the issuer's curve sit vs comparables, and how liquid are those bonds in secondary (outstanding vs actually traded)?*

**Layout**
- Header: issuer + sector/rating context.
- Scatter / curve: peers plotted spread (y) vs tenor (x), issuer's bonds highlighted; shows relative value on the curve.
- Peer table: issuer, rating, amount **outstanding**, recent **traded volume** (proxy for liquidity), z-spread, last change. Sort by outstanding by default.
- Liquidity read per row: a small `traded/outstanding` ratio bar (turnover).

**Data contract**
```ts
interface PeerBond {
  id: string;
  issuer: string;
  isSelf: boolean;             // highlight issuer's own bonds
  rating: string;
  tenorYears: number;          // x-axis
  zSpreadBps: number;          // y-axis
  outstandingMm: number;
  tradedMm: number;            // recent window — liquidity proxy
  changeBps: number;           // spread change
}
interface PeerAnalysisData {
  issuer: string;
  sector: string;
  benchmarkLabel: string;      // "EUR IG autos, 3–7Y"
  peers: PeerBond[];           // ~6–10 rows
}
```
**Hydration** — labels: axes/headers + peer names. data: scatter points draw-in, table numbers, turnover bars.
**A11y** — scatter paired with the table as its accessible equivalent (`aria-describedby` → table); table sortable via header `button`s with `aria-sort`.

### 4.6 `AllocationSummary` (expand existing)
*Syndicate post-allocation: who got filled, by investor type / geography / quality, and the desk's hit rate.*

**Expanded layout**
- Header: bond name + total allocated / total book (with coverage x).
- **Three breakdown tabs** (segmented control, `aria-pressed`): By Investor Type · By Geography · By Quality. Each renders a horizontal 100%-stacked bar + a ranked list with % and amount.
- Quality of book strip: real-money vs fast-money split, top-10 concentration, number of accounts.
- Hit-rate / scaleback callout: orders vs allocated, average fill %.

**Data contract**
```ts
interface AllocSegment {
  label: string;          // "Asset managers", "UK", "Real money"
  allocatedMm: number;
  pct: number;            // 0–100
  color: string;
}
interface AllocationBreakdown {
  id: 'investorType' | 'geography' | 'quality';
  label: string;
  segments: AllocSegment[];
}
interface AllocationSummaryData {
  bondName: string;
  dealSizeMm: number;
  orderbookMm: number;
  bookCoverage: number;
  accounts: number;
  top10Pct: number;            // concentration
  realMoneyPct: number;
  avgFillPct: number;          // hit rate
  breakdowns: AllocationBreakdown[];   // the 3 tabs
}
```
**Hydration** — labels: tabs + segment labels. data: stacked bars grow, list %s, quality strip.
**A11y** — tabs as `role="tablist"`/`tab`/`tabpanel` with arrow-key nav; each stacked bar paired with the ranked list as its text equivalent; segments labeled, not color-only.
**Composition note** — the three breakdowns are *data variants*, not boolean props: one `<AllocationBreakdownView breakdown=...>` rendered per active tab (explicit-variants principle, no `showGeography` flags).

### 4.7 `SecondaryPerformance` (refine existing)
*Syndicate/sales: how is the bond trading after pricing vs reoffer — did it break tighter (well-priced) or wider?*

**Changes vs current** — keep the intraday line; (a) add a dual read (price vs reoffer **and** spread vs reoffer), (b) "break" callout (first secondary print vs reoffer), (c) tabular-nums, (d) reduced-motion-safe draw-in.

**Data contract** — formalize existing `secondaryPerf` / `secondarySummary`:
```ts
interface SecondaryPerfData {
  bondName: string;
  reofferPrice: number;
  reofferSpreadBps: number;
  series: { t: string; price: number; spreadBps: number }[];
  // current* derived during render from series tail (no effect)
}
```
**Hydration** — labels: title + axis labels. data: line draw-in + current read.
**A11y** — line chart gets `figcaption` summary ("up 0.41 from reoffer, 4 bps tighter"); reference line for reoffer labeled.

## 5. Shared Architecture

### 5.1 File layout
Extend the existing lab folder; do not fork the engine.

```
client/src/lab/issuance-components/
  IssuanceComponentsLabView.tsx   # harness — add new cards to the grid
  useHydration.ts                 # reuse as-is
  Skeleton.tsx                    # reuse Hydrate / SkeletonText
  icons.tsx                       # add any new icons here
  format.ts                       # NEW — Intl-based formatters (shared)
  data/
    deal.ts                       # DealSnapshot + NewIssueTerms + Secondary
    market.ts                     # IssuanceWindow + CrossCurrencyRV
    book.ts                       # AllocationSummary + PeerAnalysis
  components/
    primitives/
      Card.tsx                    # compound card shell (Header/Eyebrow/Metric)
      MetricStat.tsx              # label + tabular value + delta chip
      Segmented.tsx               # accessible tablist control
      ChartFigure.tsx             # figure+figcaption wrapper for Recharts
    IssuanceWindow.tsx
    DealSnapshot.tsx              # refactor existing
    NewIssueTermsMonitor.tsx
    CrossCurrencyRelativeValue.tsx
    PeerAnalysis.tsx
    AllocationSummary.tsx         # refactor existing
    SecondaryPerformance.tsx      # refactor existing
  registry.ts                     # NEW — kind -> component map for generated UI
```

### 5.2 Component contract (uniform)
Every issuance component has the same outer signature so the registry can render any of them:

```ts
interface IssuanceComponentProps<T> {
  data: T;            // typed payload (the "generated" content)
  mode: HydrationMode;
  runId: number;
  delay?: number;
}
```

No behavior booleans. Structural differences become separate components; data differences live in `data`. This satisfies `architecture-avoid-boolean-props` and `patterns-explicit-variants`.

### 5.3 Compound primitives (composition patterns)
- `Card` exposes `Card.Eyebrow`, `Card.Title`, `Card.Body`, `Card.Footer` via a tiny context so the card shell, padding, and focus styles live in one place and children compose freely (`children` over render props, `architecture-compound-components`).
- `MetricStat`, `Segmented`, and `ChartFigure` are leaf primitives shared across all 7 components — single source of truth for tabular-nums, delta-chip tones, tablist a11y, and `figure/figcaption`.
- React 18: primitives that need a forwarded ref use `forwardRef`; do **not** introduce React-19-only `use()`.

### 5.4 Registry (generated-UI mapping)
A typed map lets a generated response say `{ kind, data }` and get the right card. Keep payload typing discriminated so TS catches mismatched data.

```ts
type IssuanceBlock =
  | { kind: 'issuanceWindow'; data: IssuanceWindowData }
  | { kind: 'dealSnapshot'; data: DealSnapshotData }
  | { kind: 'newIssueTerms'; data: NewIssueTermsData }
  | { kind: 'crossCurrencyRV'; data: CrossCurrencyRVData }
  | { kind: 'peerAnalysis'; data: PeerAnalysisData }
  | { kind: 'allocationSummary'; data: AllocationSummaryData }
  | { kind: 'secondaryPerformance'; data: SecondaryPerfData };

// registry.tsx renders <IssuanceRenderer block={...} mode runId /> by switching on kind.
```

This keeps the "generated UI" idea concrete: the model emits an `IssuanceBlock` (or list of them), the renderer hydrates each card. Unknown `kind` → graceful fallback card, never a crash.

### 5.5 Formatters (`format.ts`)
Centralize so number/date rules are consistent and `Intl`-based:
```ts
fmtBps(n)        // "88 bps" (nbsp), sign-aware for deltas
fmtCcyMm(n,ccy)  // 1250 -> "€1.25 bn" via Intl.NumberFormat
fmtPct(n,dp?)    // "3.28x" / "62%"
fmtDate(iso)     // Intl.DateTimeFormat, locale-aware
fmtSignedBps(n)  // "▼ 12 bps" tightening helper
```

## 6. Build Phases

Sequenced so each phase ends with something runnable in the lab.

**Phase 0 — Foundation (enables everything)**
- Add `format.ts`, `data/{deal,market,book}.ts` (move existing mock data over), `components/primitives/{Card,MetricStat,Segmented,ChartFigure}.tsx`.
- Add global `prefers-reduced-motion` guard to `index.css` for hydration + chart draw-in.
- *Done when:* primitives render in isolation; existing cards still build (`npm --prefix client run build`).

**Phase 1 — Refactor the 3 existing cards to the contract**
- `DealSnapshot`, `SecondaryPerformance`, `AllocationSummary` → uniform `IssuanceComponentProps<T>`, primitives, formatters, tabular-nums, empty states.
- *Done when:* no visual regression in the lab; all three consume typed data.

**Phase 2 — Expand `AllocationSummary`**
- Add the 3 breakdown tabs (Segmented), quality strip, hit-rate callout, explicit `AllocationBreakdownView` variant.
- *Done when:* tabs are keyboard-navigable, each bar has a text equivalent.

**Phase 3 — New deal-lifecycle card**
- `NewIssueTermsMonitor` (stepper + range bar + tightening hero).
- *Done when:* range bar + stepper hydrate; sr-only summary present.

**Phase 4 — New market/RV cards**
- `IssuanceWindow` (read chip + gauges + score sparkline).
- `CrossCurrencyRelativeValue` (comparison table + all-in bar, cheapest flagged).
- *Done when:* both render with correct empty/partial handling.

**Phase 5 — Peer analysis**
- `PeerAnalysis` (scatter + sortable table + turnover bars).
- *Done when:* scatter has table equivalent; headers sortable with `aria-sort`.

**Phase 6 — Studio lab + registry wiring**
- `registry.tsx` (`kind -> component`) + `BondIssuanceStudioLabView` (selector studio per §8.1) + new `issuance_studio` lab mode in `App.tsx`. URL-synced selection; unknown-kind fallback.
- *Done when:* you can switch between all 7 component types and their sub-views, each re-hydrating on switch.

**Phase 7 — QA & polish**
- Run the Web Interface Guidelines review against `components/**`; fix findings.
- Verify reduced-motion, focus order, tabular-nums, long/empty content.

## 7. Acceptance Criteria (QA checklist)

Mapped to the loaded guidelines — every component must pass before its phase is "done":

- [ ] **Build**: `npm --prefix client run build` clean (tsc + vite).
- [ ] **A11y**: semantic HTML; icon buttons have `aria-label`; charts have text equivalents; tabs/steppers have correct roles + keyboard nav.
- [ ] **Focus**: visible `focus-visible` ring on every interactive element; no bare `outline-none`.
- [ ] **Motion**: hydration + chart draw-in collapse under `prefers-reduced-motion`; only `transform`/`opacity` animated; no `transition: all`.
- [ ] **Numbers**: `tabular-nums` on all numeric/comparison cells; all values via `Intl` formatters; `…`, curly quotes, nbsp units.
- [ ] **Content**: long/short/missing values handled (`truncate`/`line-clamp`, `min-w-0`); explicit empty/partial states (e.g. pre-priced deal).
- [ ] **Perf**: derived state in render (no effects for derivations); static config hoisted; no layout reads in render; reduced SVG precision.
- [ ] **Composition**: no behavior boolean props; structural variants are explicit components; primitives shared (no duplicated card/metric/tab code).
- [ ] **Registry**: discriminated union typed; unknown `kind` falls back gracefully.

## 8. Risks & Open Questions

- **Recharts a11y** is weak by default — mitigated by pairing every chart with a `figcaption`/table text equivalent rather than relying on the SVG.
- **Data realism**: mock numbers should be internally consistent (e.g. tightening in `NewIssueTermsMonitor` must match `DealSnapshot` spreads) so demos look credible. Keep cross-component constants in the shared `data/` modules.
- **Scope of "generated"**: this phase stops at registry + sample blocks. Wiring to an actual model/stream is a later phase; the discriminated union is the contract that makes that wiring trivial.

**Resolved decisions**
1. **Switch, don't combine.** The lab is a *selector*, not a stacked gallery: a top-level segmented control picks **one** component type to view at a time, and a second selector picks a **sub-component / sample state** within that type (e.g. `DealSnapshot` → different deals/statuses; `AllocationSummary` → investor-type / geography / quality; `NewIssueTermsMonitor` → IPT/guidance/launch/priced). No combined `IssuanceBlock[]` view.
2. **EUR base currency.** Formatters default to EUR (`Intl.NumberFormat('en-GB', { currency: 'EUR' })`), matching the existing BMW mock. No locale switch for now.
3. **New lab mode.** Add `issuance_studio` to `App.tsx` (`LabMode` + `LAB_MODE_LABEL` + render switch). The existing `issuance_components` lab stays untouched; the new lab is the selector-driven studio.

### 8.1 New-lab UX (resolved #1 & #3)
`BondIssuanceStudioLabView` layout:
- **Header**: title + Progressive/Instant toggle + Replay (reuse the existing harness controls).
- **Primary selector** (segmented, `role="tablist"`): the 7 component types. Switching changes the active card and resets the sub-selector + replays hydration.
- **Sub selector** (segmented or dropdown, contextual per type): chooses the sample/sub-view. Each type declares its own sub-options in a small config so the studio stays generic.
- **Stage**: renders exactly one component for the active `{ type, sub }`, keyed so it re-hydrates on every switch.
- State is URL-synced (`?c=dealSnapshot&v=priced`) per the guidelines (deep-linkable stateful UI).


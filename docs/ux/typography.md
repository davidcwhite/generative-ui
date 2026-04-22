# Typography

All type rules live either in [client/src/index.css](../../client/src/index.css) (the global stylesheet) or as Tailwind utilities applied per element.

## Font stack

Set on `body` in `index.css`:

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
  Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

This resolves to **San Francisco** on macOS/iOS, **Segoe UI** on Windows, and Roboto on most Linux/Android devices. No web fonts are loaded.

### Monospace stack

Used for code, ISINs, and other identifiers:

```css
font-family: 'SF Mono', Monaco, 'Courier New', monospace;
```

Examples in code:

- Inline code in markdown: `.markdown-content code` in [client/src/index.css](../../client/src/index.css)
- ISIN cells: `font-mono text-xs` in [client/src/components/dcm/IssuerTimeline.tsx](../../client/src/components/dcm/IssuerTimeline.tsx)
- ISIN badge in [client/src/components/dcm/SecondaryPerformanceView.tsx](../../client/src/components/dcm/SecondaryPerformanceView.tsx)

## Size scale

The app uses a tight subset of Tailwind sizes:

- `text-[10px]` — micro labels (risk badge in [client/src/components/ApprovalCard.tsx](../../client/src/components/ApprovalCard.tsx))
- `text-xs` (12px) — captions, table headers, eyebrow labels, chips
- `text-sm` (14px) — **default body size**, buttons, inputs, table cells, chat messages
- `text-base` — rarely used directly
- `text-lg` (18px) — page H1 ("Primary Flow Canvas")
- `text-xl` (20px) — Dashboard tab titles ("Recent Issuance")
- `text-2xl` (24px) — empty-state heading ("Component-first flow") and metric numerals in [client/src/components/dcm/MarketIssuance.tsx](../../client/src/components/dcm/MarketIssuance.tsx)

Markdown body text inside chat is fixed at `14px / 1.6` line-height by `.markdown-content` in `index.css`.

## Weight scale

- `font-normal` (400) — body, italic accent words
- `font-medium` (500) — nav items, table cells that need light emphasis, suggestion buttons
- `font-semibold` (600) — card headers, H1/H2/H3, button labels
- `font-bold` (700) — DealCard hero numbers, MarketIssuance KPI numerals
- Markdown `<strong>` is overridden to `font-weight: 600` (semibold) in `index.css`

## Italic accent

A signature pattern: page titles split a normal-weight italic word from the bold lead-in.

Examples in [client/src/App.tsx](../../client/src/App.tsx):

```tsx
<h1 className="text-lg font-semibold text-[#1A1A1A]">
  Primary Flow <span className="font-normal italic">Canvas</span>
</h1>
```

```tsx
<h2 className="text-2xl font-semibold text-[#1A1A1A] mb-2">
  Component-first <span className="font-normal italic">flow</span>
</h2>
```

And the Dashboard ([client/src/components/Dashboard.tsx](../../client/src/components/Dashboard.tsx)):

```tsx
<h1>Primary Flow <span className="font-normal italic">Data</span></h1>
```

Italic is also used for transient/loading state lines (`italic text-stone-500 py-2`) like "Querying employees..." in `App.tsx`.

## Color × type pairings

| Use | Class | Hex |
|---|---|---|
| Headings / brand | `text-[#1A1A1A]` | `#1A1A1A` |
| Card headers | `text-stone-700` / `text-stone-800` | `#44403c` / `#292524` |
| Body | `text-stone-600` / `text-stone-700` | `#57534e` / `#44403c` |
| Captions / eyebrows | `text-stone-500` | `#78716c` |
| Disabled / muted | `text-stone-400` | `#a8a29e` |
| Inverted | `text-white` (on dark or gradient) | `#ffffff` |

## Markdown prose

Two themed prose blocks are defined in [client/src/index.css](../../client/src/index.css):

- `.markdown-content` — assistant text (default light surface)
- `.markdown-content-user` — user message bubble (slightly darker, link styling differs)

They normalise spacing for `<p>`, `<ul>`, `<ol>`, `<h1-4>`, `<code>`, `<pre>`, `<blockquote>`, `<table>`, `<a>`, and `<strong>`. When rendering message text in [client/src/App.tsx](../../client/src/App.tsx), the role determines which class is applied:

```tsx
const markdownClass = message.role === 'user'
  ? 'markdown-content markdown-content-user'
  : 'markdown-content';
```

### Markdown size deltas

`.markdown-content h1 { font-size: 1.4em }`, `h2: 1.2em`, `h3: 1.1em` — relative to the `14px` base, so even an H1 in chat is only ~20px to keep the conversation flowing.

## Tracking & casing

The only place letter-spacing is used is for eyebrow labels:

```tsx
<span className="text-xs font-medium text-stone-400 uppercase tracking-wide">Recent</span>
```

(See the History flyover and the empty-state in [client/src/App.tsx](../../client/src/App.tsx).)

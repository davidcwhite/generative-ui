# Styles — spacing, radius, shadows, borders, focus, transitions

This is the "everything else" reference: the small set of Tailwind utilities the app uses repeatedly.

## Global resets

From [client/src/index.css](../../client/src/index.css):

```css
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { background-color: #fafaf9; /* stone-50 */ }
```

The body background is `stone-50`, but every shell view repaints to `#FAFAF8` — see [layout.md](layout.md).

## Spacing scale

The app uses a tight subset of Tailwind spacing (each unit = 4px):

- Gaps inside rows: `gap-1`, `gap-2`, `gap-3`, `gap-4`
- Card body padding: `p-3`, `p-4`, `p-5` (the rich AllocationsView card)
- Card header padding: `px-4 py-3`
- Table cell padding: `px-3 py-2.5` (cozy) or `px-4 py-2` (compact peer table)
- Stat strip cells: `px-3 py-2` or `px-4 py-2`
- Form field row gap: `gap-3` (column) inside FilterForm
- Vertical rhythm between cards in the chat: `mt-3` (every Card root) + `mb-4` on the wrapper in `App.tsx`

Spacing inside rich content (timelines, dashboards) follows `space-y-{1,2,4}` for vertical lists.

## Border-radius scale

| Class | Pixels | Use |
|---|---|---|
| `rounded` | 4px | Inline status chips (`bg-stone-100 ...`) |
| `rounded-md` | 6px | Form inputs, primary/secondary buttons in FilterForm/ApprovalCard |
| `rounded-lg` | 8px | **Card root**, rail icon buttons, mobile menu items |
| `rounded-xl` | 12px | Login input, suggestion buttons, Dashboard cards |
| `rounded-2xl` | 16px | Chat input pill, message bubbles |
| `rounded-full` | full | Send / stop button, circle dots in IssuerTimeline, sector chips |

## Shadows

| Class | Use |
|---|---|
| `shadow-sm` | Default card elevation (`Card shell` everywhere) |
| `shadow-md` | Hover elevation on dashboard allocation cards (`hover:shadow-md`) and chat input focus-within |
| `shadow-lg` | History flyover panel |
| `shadow-xl` | Mobile drawer |

The chat input has a soft promotion on interaction:

```tsx
className="bg-white border border-[#E5E5E3] rounded-2xl shadow-sm focus-within:shadow-md focus-within:border-[#D5D5D3] transition-all"
```

(See [client/src/App.tsx](../../client/src/App.tsx).)

## Borders

- Hairline brand border: `border border-[#E5E5E3]` on rail/header/dashboard surfaces
- Stone borders: `border border-stone-200` on chat-rendered cards
- Dividers: `border-b border-stone-200`, `border-t border-stone-200`, and `divide-x divide-stone-200` for metric strips
- Form inputs: `border border-stone-300`
- Highlight border on selected items: `border-l-4 border-blue-500` (EntityPicker)
- Strong rule for blockquotes: `border-left: 3px solid #d6d3d1` (`.markdown-content blockquote` in `index.css`)

## Surfaces

| Token | Class | Used for |
|---|---|---|
| Page | `bg-[#FAFAF8]` | The shell behind chat & dashboard |
| Sticky header (translucent) | `bg-[#FAFAF8]/80 backdrop-blur-sm` | The header strip in chat & dashboard |
| Rail / mobile header | `bg-[#F5F5F3]` | Left rail + mobile top bar |
| Drawer / panel | `bg-white` | Mobile drawer, History flyover, password card |
| Card | `bg-white` | Every generated UI card |
| Card header | `bg-stone-100` (stone) or `bg-gradient-to-r from-{hue}-600 to-{hue}-700` (DCM) |
| Card sub-strip / muted info | `bg-stone-50`, `bg-stone-100` |
| Subtle nested row | `bg-stone-50` (e.g. timeline content blocks, top investors list) |
| Backdrop | `bg-black/50` (mobile drawer) |

## Focus & hover

### Focus rings

Form inputs and primary buttons use a low-saturation ring:

```tsx
className="focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
```

Buttons sometimes use the offset variant:

```tsx
className="focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
```

The login input uses a stone ring instead:

```tsx
className="focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
```

### Hover patterns

- Buttons: change background hue (`hover:bg-blue-700`, `hover:bg-stone-50`, `hover:bg-[#E5E5E3]`)
- Table rows: `hover:bg-stone-50` or `hover:bg-[#FAFAF8]`
- Cards: `hover:border-blue-200 transition-colors` (timeline items), `hover:shadow-md transition-shadow` (dashboard cards)
- Suggestions: `hover:border-stone-300 hover:bg-stone-50` plus a `group` that promotes the leading arrow icon (`group-hover:text-stone-500`)

### Selection / active state

- Active nav button: `bg-[#E5E5E3]` + `text-[#1A1A1A]` (rail) or `bg-stone-100` (mobile menu)
- Active dashboard tab: `bg-[#1A1A1A] text-white`
- Selected EntityPicker row: `bg-blue-50 border-l-4 border-blue-500`
- Active session in History flyover: `bg-stone-100`

## Transitions

Every interactive element uses one of three transition utilities:

- `transition-colors` — bg/text/border swaps (most common)
- `transition-shadow` — hover elevation (dashboard allocation cards)
- `transition-all` — chat input (border + shadow change together)
- `transition-opacity` — group-hover reveal (delete button on history rows)

Animation duration defaults to Tailwind's 150ms; no custom duration overrides anywhere in the app.

The only **bespoke** animations are the spinner (`animate-spin` from Tailwind) and Recharts' built-in series animations (`animationDuration={500}` in the generic `ChartCard`; disabled in DCM views with `isAnimationActive={false}`).

## Disabled state

```tsx
disabled:bg-stone-300 disabled:cursor-not-allowed
```

(Login button.)

```tsx
disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed
```

(Chat send button — see [client/src/App.tsx](../../client/src/App.tsx).)

ExportPanel disables format buttons after a selection:

```tsx
disabled
  ? 'bg-stone-50 border-stone-200 text-stone-400 cursor-not-allowed'
  : '…'
```

## z-index layers

- Mobile drawer container: `z-50`
- History flyover: `z-50`
- Sticky chat / dashboard header: `z-10`
- Sticky table headers (TableCard): `z-10`
- Rail sidebar: `z-40`

## Scroll containers

- Chat scroll area: outer `flex-1 overflow-auto` wrapping `max-w-3xl` column
- Dashboard scroll area: same pattern
- TableCard body: `overflow-x-auto overflow-y-auto max-h-[350px]` with sticky `<thead>`
- Markdown `<pre>`: `overflow-x: auto` (defined in `index.css`)

## Layout primitives

- Centered content columns: `max-w-3xl mx-auto` (chat) / `max-w-5xl mx-auto` (dashboard) / `max-w-xl` (suggestion stack) / `max-w-sm` (login)
- Vertical app shell: `h-screen w-full bg-[#FAFAF8]` with `flex flex-col md:flex-row`
- Card content grids: `grid grid-cols-2`, `grid grid-cols-3`, `grid grid-cols-4`, with `divide-x divide-stone-200` for metric strips
- Responsive overrides: most layout-affecting classes are paired with `md:` variants (e.g. `hidden md:flex` for the rail vs. `md:hidden` for the mobile header)

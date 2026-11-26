# 08 · Design system

The design system for QAI (D79). Developers build on it: colours and sizes live **only in `src/index.css` (CSS variables) and
`tailwind.config.ts` (their Tailwind names)**, and the shared primitives in `src/components/ui`. Screens never hard-code colours or sizes.
Direction: a dense, calm work tool (Data-Dense lists and tables, Swiss-style spacing on summary screens, WCAG 2.2 AA as the floor).
Every screen and dialog follows it (D79, D80); `reference/prototype-screens/` shows each one in the light theme.

## Themes
Light and dark, both designed. Global settings › Appearance: **Follow system** (default) · Light · Dark (2.3). The choice resolves to
`<html data-theme="light|dark">` (`src/lib/theme.ts`, `src/app/settings.tsx`); "Follow system" tracks the OS while chosen. The last choice is
remembered on the device (`qai.theme`) so `index.html` sets the theme before the first paint (no white flash).
Dark is not an inversion: surfaces get lighter as they rise (page → list → dialog), status fills are deep tints with light text, status dots are brighter.

## Colour tokens
Accent: **QAI Violet**. `--accent` is the readable violet (links, focus ring, selected edges, marks such as progress bars);
`--accent-fill` is for solid fills (primary buttons, count badges) with `--accent-contrast` text.
Every pair below is checked by `src/lib/designTokens.test.ts` in both themes: text 4.5:1 on every surface it sits on; dots, rings,
chart marks, input edges and the focus ring 3:1. A new token or pair is added to that test.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | #F5F6F8 | #0E1116 | App background |
| `--surface` | #FFFFFF | #161A21 | Cards, lists, panels |
| `--surface-muted` | #F9FAFB | #12161C | Sidebar and masthead |
| `--surface-raised` | #FFFFFF | #1D222B | Dialogs, menus |
| `--border` | #DDE1E6 | #2A303A | Dividers (decorative) |
| `--border-control` | #828C9B | #5F6978 | Input, select and checkbox edges (3:1) |
| `--text` | #1A1D23 | #E7EAEE | Body text |
| `--text-muted` | #596170 | #9AA3B0 | Secondary text |
| `--accent` | #5B3FD0 | #B0A2FF | Links, focus ring, selected edges, marks |
| `--accent-fill` | #5B3FD0 | #6D53E3 | Primary buttons, count badges |
| `--accent-contrast` | #FFFFFF | #FFFFFF | Text and icons on `--accent-fill` |
| `--accent-soft` / `--accent-soft-text` | #EFEBFD / #4A30B0 | #251F45 / #C9C0FF | Selected rows, active nav, info chips |
| `--inverse` / `--inverse-text` / `--inverse-accent` | #1A1D23 / #FFFFFF / #C9C0FF | #E7EAEE / #161A21 / #4A30B0 | Toasts, tooltips (Undo in a toast) |
| `--passed-*` fill · border · text · dot | #E6F3EA · #B5DBC0 · #1E5C2D · #2B8A4B | #10291A · #24583A · #82D9A0 · #3FB96A | Passed |
| `--failed-*` fill · border · text · dot | #FCEBE4 · #F1C2AF · #8C3312 · #C2410C | #33180D · #74331A · #FFA987 · #F26B32 | Failed |
| `--cc-*` fill · border · text · dot | #FCF2DC · #EBD196 · #6B4800 · #B07A0A | #2D2308 · #665019 · #F0CB6B · #D9A425 | Couldn't complete, warnings |
| `--notrun` | #848C97 | #7F8895 | Not run (hollow ring) |
| `--chart-passed` · `--chart-failed` · `--chart-cc` | #2B8A4B · #C2410C · #AD8A00 | #3FB96A · #F26B32 · #E3C443 | Chart marks (D77). Couldn't complete is a clearer yellow than its dot so it stays apart from Failed side by side; legends and text versions always present. Not run is never drawn |
| `--backdrop` | rgba(26,29,35,0.45) | rgba(0,0,0,0.6) | Behind dialogs |
| `--shadow-popover` · `--shadow-overlay` | soft | deeper | Menus and toasts · dialogs (`shadow-popover`, `shadow-overlay`) |

Status is never shown by colour alone: dot or icon plus an accessible label; Failed and Passed also differ in lightness.

## Type
- **Inter** (bundled with the app through `@fontsource/inter`, so it is the same on Windows, macOS and Linux and works offline), fallback system-ui.
- **Monospace** (`font-mono`): the system stack `ui-monospace, Cascadia Mono, SF Mono, Menlo, Consolas`, for test IDs, selectors, URLs and timings. Nothing extra is downloaded.
- Sizes: `label` 12 px semibold muted · **`dense` 13 px for lists and tables (Suites tree, Run results, Runs, Projects, Overview)** · `base` 14 px for forms, dialogs and reading · `h3` 18 · `h2` 20 · `h1` 22 px semibold · `figure` 28 px semibold for the Overview pass-rate donut (D77) · `display` 48 px and `display-sub` 32 px (medium) for the AI explore new-chat greeting only (D70).
- **Tabular figures** (`tabular-nums`) on number columns only: costs, durations, counts, run numbers. Not on running text: Inter's tabular set also widens hyphens (NAV-01).
- Spacing scale 4/8/12/16/20/24/32; radius 8 (controls), 12 (cards, menus, tiles), 999 (chips, pills).
- Focus: 2 px `--accent` outline, 2 px offset, on every focusable element.

## Brand
- **QAI mark** (D76): a play triangle of three rounded gradient bars that weave over each other (orange over purple, green over orange, purple over green). Vector file `public/qai-mark.svg` (also the window / tab icon); React component `QaiMark` (`src/components/QaiMark.tsx`), 28 px next to the "QAI" word in the masthead. Its colours are part of the mark only, never UI tokens. Do not redraw, recolour or put it on a tile.

## Charts (D77)
- Status charts use the `--chart-*` tokens only; never the brand mark's colours or other hues.
- Thin marks with a 2 px surface gap between segments; bars rounded 4 px at their end only; one shared scale per chart; the value at the bar's end.
- A legend with text for every chart, a hover tooltip per segment, and a screen-reader text version (colour is never the only signal).

## Accessibility (D81)
WCAG 2.2 AA is the floor, checked rather than assumed:
- **Contrast**: every token pair in both themes is a unit test (`src/lib/designTokens.test.ts`); a new colour or pair is added there.
- **Focus**: a 2 px `--accent` ring with a 2 px offset on every focusable element (`:focus-visible`). Composite controls show it on the whole control (the filter pill rings when its select has keyboard focus; inputs ring at their edge).
- **Motion**: `prefers-reduced-motion: reduce` stops every animation and transition app-wide (`src/index.css`): spinners stand still, fades and smooth scrolling are instant.
- **Names and structure**: every button, link and field has an accessible name (icon-only buttons an `aria-label`); decorative icons are `aria-hidden`; status is never colour alone (icon shape + text); one `h1` per page (an open AI explore chat has a visually hidden "AI explore · <chat title>").
- **Targets**: interactive controls are at least 28 px high (xs buttons, segmented options), above the 24 px minimum.
- **Keyboard**: Tab order follows the reading order (masthead → sidebar → page header → filters → list → detail); row quick actions (Re-run) appear on keyboard focus as well as hover.

## Component language (D80)
Approved from the design canvas "QAI Visual Design" (component sheet, Run results, Suites). Every building block in light and dark.
- **Interaction colours**: `--hover` for hovered rows, secondary/ghost buttons and menu items (lifts in dark, where `--bg` is darker than `--surface`); `--accent-fill-hover` for primary buttons (darker in both themes: every lighter violet fails white text). Never `hover:bg-bg`.
- **Buttons** (`Button`, `buttonClasses`): weight 500, **icon + label** (`icon` prop, lucide, 16 px; 14 px at xs). Primary: violet fill with a soft top highlight (`shadow-primary`); secondary: surface, border and a 1 px lift (`shadow-lift`); ghost; danger; inverse (on the bulk bar). Sizes **xs 28** (row actions) · **sm 32** (toolbars, bulk bar) · **md 36** (page and dialog actions). One size per row; **the primary action is last (rightmost)**; rarely used actions go into an icon-only **⋯** menu (`Menu` with `iconOnly`). A Menu trigger takes its row's size; `placement="up"` near the bottom of the window.
- **Chips** (`Chip`): 22 px, weight 500, soft fill without border, optional leading icon. Tones neutral · passed · failed · cc · info · outline (Not run). **Status chips** carry the status icon (`StatusChip`); reason, mode and browser chips are neutral with their own icon (`ReasonChip`, `ModeChip`, `BrowserChip`): the status chip already carries the colour.
- **Status shapes** (`statusIcons`): ✓ circle (passed) · ✕ circle (failed) · ! triangle (couldn't complete) · empty ring (not run), so no status depends on colour. Steps use round tinted markers with the same glyphs.
- **Filters**: one toolbar. `SearchInput` (leading magnifier) · `FilterSelect` pill "Label: Value ▾" (a native select; as wide as its longest option, ellipsis when squeezed, never a fixed max width; accent like an on toggle pill while it narrows the list (`active`); dashed and muted when `disabled`, D87) · `SegmentedControl` for 2–5 always-visible options (toggle buttons in a labelled group) · toggle pills for on/off filters (`aria-pressed`) · Clear filters (ghost, ×).
- **Summary tiles** (`StatusTiles`): All + one tile per status, each a toggle that filters, in one row, then a thin proportion bar. Pressed = violet edge and soft fill.
- **List rows**: 13 px, two lines (ID in monospace, title weight 500; muted second line), right-aligned tabular numbers. Selected = soft violet fill; hover = `--hover` and the row's quick action (xs) appears, also on keyboard focus.
- **Bulk bar** (`BulkBar`): inverse, floating at the bottom centre, one line, icon actions (`variant="inverse"`; the run action may stay primary), × to clear. Used wherever rows can be ticked (Run results, Suites), so ticking never moves the list.
- **Status counts**: `StatusCountChips` (chips with icons) where there is room; `StatusCountsCompact` in table cells (mini proportion bar + "✓ 72 ✕ 8 ! 3", tabular numbers; the sentence is the accessible text). **Run state** chips carry an icon (`RunStateChip`: spinner while running, pause, unplug, stop, done).
- **Tables**: `Table dense` for lists people scan (Runs, Projects, Overview): 13 px, tighter rows; numbers right-aligned and tabular; row actions xs ("Open →").
- **Empty states** (`EmptyState`): an icon tile, a title, one line, the next actions. No illustrations.
- **Section cards** (`SectionCard`, `SectionHeading`): an optional icon tile beside the section title (Knowledge, Environments, Project settings, Global settings), so long settings pages scan by shape.
- **Stepper** (Import): numbered circles joined by a line; done = check on soft violet, current = filled violet, later = outlined; the current step has `aria-current="step"`.
- **Icon map** (lucide; same action, same icon everywhere): Run / Start run / Resume ▶ `Play` · Re-run `RotateCcw` · Edit `Pencil` · Clone `Copy` · Delete / Remove `Trash2` · More `Ellipsis` · New / Add `Plus` · New suite `FolderPlus` · Move to suite `FolderInput` · Import / Upload `Upload` · Export / Download `Download` · Copy bug report `Bug` · Known issue `Tag` · Override `ShieldCheck` · Pause `Pause` · Stop `CircleStop` · Skip test `SkipForward` · Watch `Eye` · Open → `ArrowRight` · Back `ArrowLeft` · Link knowledge `Link2` · Edit scope `SlidersHorizontal` · Replace `RefreshCw` · Back up `DatabaseBackup` · Restore `ArchiveRestore` · AI (AI run, AI settings, Suggest rows) `Sparkles` · AI explore `AiExploreIcon` (D82: a compass with the AI sparkle where the ring breaks; `src/components/AiExploreIcon.tsx`, drawn on lucide's grid and stroke; used on the masthead button, Explore with AI, the AI explore header, AI replies in a chat and Source: AI explore) · Script `FileCode` · Data rows `Table2` · Browser `Globe` · Environment `Server` · Suite `Folder`. Dialog Cancel and Save / Create stay text only.
- **Cards**: radius 12, border, no shadow; pressable tiles add `shadow-lift`. **Failure card**: surface with a failed/cc edge, a tinted icon tile, Expected and Found side by side, the recommendation with its action.
- **Tabs**: weight 500 with an icon; selected = `--text` with a 2 px `--accent` underline.
- **Fields**: 36 px; `--border-control` edge (3:1), darker on hover, `--accent` edge on focus; themed select chevron. Checkbox and radio native (`accent-color`).
- **Menu**: raised card (radius 12, 4 px padding, `shadow-popover`), rounded items. **Dialog**: raised surface, `shadow-overlay`. **Toast / tooltip**: inverse surface.
- Tailwind-merge knows the token names (`src/lib/utils.ts`): add a new token size, shadow or background image there too, or `cn()` drops classes.

## Components (build in `src/components/ui` + `src/components`)
Button (primary / secondary / ghost / danger, icon-only with aria-label) · Chip (neutral/passed/failed/cc/info) · StatusDot · StatusIcon · Tabs · Table · Dialog / Sheet · Select · Checkbox · Toggle · Textarea · Toast (with Undo) · Tooltip · EmptyState · Banner (info/warning) · PassRateDonut · SuiteStatusBars (Overview charts, D77) · SplitPane (draggable, keyboard) · Sidebar (collapsible, remembered) · Masthead (menu button + brand, then breadcrumb + AI explore) · Breadcrumb · SummaryFilterButtons · FilterBar · BulkBar · ResultRow · TestRow · StepList (3-level) · NarrationPanel · ScreenshotPlaceholder (prototype: grey box with caption; sizes thumb 80 px · preview up to 240 px · panel full width; a step's thumb grows into its preview, D84) · VisualMarkBadge (top-right of a step's screenshot: compact icon + number on the thumb, full chip on the preview; solid fill with a surface ring so it reads over any image; decorative, the screenshot button's name says it, D88).

## Layout
Desktop app: design for 1280–1920 px. Sidebar 220 px (collapsed: 64 px icon rail); nav rows 40 px, icons on one column centred 32 px from the edge in both states (D74). Masthead 56 px, static, in the sidebar's colour; the line under it starts at the sidebar's edge. Content padding 20–24 px. Dialogs 720–820 px wide.

# 08 · Design system (INTERIM)

The visual design phase has not happened yet. Use these interim tokens so the prototype is clean and consistent; they will be replaced later **only in `tailwind.config` / CSS variables and `src/components/ui`** — screens must not hard-code colours or sizes.

## Tokens (CSS variables; dark theme values to be defined in the design phase)
| Token | Value | Use |
|---|---|---|
| `--bg` | #F6F7F9 | App background |
| `--surface` | #FFFFFF | Cards, panels, sidebar content |
| `--surface-muted` | #FBFBFC | Sidebar background |
| `--border` | #D9DDE3 | Borders, dividers |
| `--text` | #1F2328 | Body text |
| `--text-muted` | #5B6370 | Secondary text (passes 4.5:1 on white) |
| `--accent` | #1F5FBF | Primary buttons, links, active nav, focus ring |
| `--accent-contrast` | #FFFFFF | Text and icons on accent (primary buttons) |
| `--accent-soft` | #E8F0FB / text #1A4C99 | Selected rows, active nav background, info chips |
| `--passed` | fill #E6F2E9 · border #B9DCC2 · text #1F5E2E · dot #2B8A4B | Passed |
| `--failed` | fill #FBEAE3 · border #F0C3B2 · text #8E3414 · dot #C2410C | Failed |
| `--cc` | fill #FBF1DC · border #EDD39A · text #6E4A00 · dot #B07A0A | Couldn't complete, warnings |
| `--notrun` | hollow ring #8A919C | Not run |
| `--chart-passed` · `--chart-failed` · `--chart-cc` | #2B8A4B · #C2410C · #AD8A00 | Chart marks for Passed, Failed, Couldn't complete (D77). Green and orange are the status dots; couldn't complete is a clearer yellow than its dot so it stays apart from Failed side by side (colour-blind separation checked; legends and text versions always present). Not run is never drawn |
| `--backdrop` | rgba(31,35,40,0.45) | Behind dialogs |
- Font: Inter (fallback system-ui), base 14 px; headings 18–22 px semibold; labels 12 px semibold muted; figure 28 px semibold for the Overview pass-rate donut (D77); display 48 px and display-sub 32 px (medium) for the AI explore new-chat greeting only (D70).
- Spacing scale 4/8/12/16/20/24/32; radius 8 (controls), 10 (cards), 999 (chips, pills).
- Status never by colour alone: dot/icon + accessible label; failed/passed differ in lightness too.

## Brand
- **QAI mark** (D76): a play triangle of three rounded gradient bars that weave over each other (orange over purple, green over orange, purple over green). Vector file `public/qai-mark.svg` (also the window / tab icon); React component `QaiMark` (`src/components/QaiMark.tsx`), 28 px next to the "QAI" word in the masthead. Its colours are part of the mark only, never UI tokens. Do not redraw, recolour or put it on a tile.

## Charts (D77)
- Status charts use the `--chart-*` tokens only; never the brand mark's colours or other hues.
- Thin marks with a 2 px surface gap between segments; bars rounded 4 px at their end only; one shared scale per chart; the value at the bar's end.
- A legend with text for every chart, a hover tooltip per segment, and a screen-reader text version (colour is never the only signal).

## Components (build in `src/components/ui` + `src/components`)
Button (primary / secondary / ghost / danger, icon-only with aria-label) · Chip (neutral/passed/failed/cc/info) · StatusDot · StatusIcon · Tabs · Table · Dialog / Sheet · Select · Checkbox · Toggle · Textarea · Toast (with Undo) · Tooltip · EmptyState · Banner (info/warning) · PassRateDonut · SuiteStatusBars (Overview charts, D77) · SplitPane (draggable, keyboard) · Sidebar (collapsible, remembered) · Masthead (menu button + brand, then breadcrumb + AI explore) · Breadcrumb · SummaryFilterButtons · FilterBar · BulkBar · ResultRow · TestRow · StepList (3-level) · NarrationPanel · ScreenshotPlaceholder (prototype: grey box with caption).

## Layout
Desktop app: design for 1280–1920 px. Sidebar 220 px (collapsed: 64 px icon rail); nav rows 40 px, icons on one column centred 32 px from the edge in both states (D74). Masthead 56 px, static, in the sidebar's colour; the line under it starts at the sidebar's edge. Content padding 20–24 px. Dialogs 720–820 px wide.

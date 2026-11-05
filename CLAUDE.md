# CLAUDE.md — QAI front-end prototype

Read this file first in every session. Then read only the docs the current task needs.

## What this project is
A **front-end prototype of QAI**, an AI-driven test automation desktop app for QA testers.
This is a **full redesign built from scratch**. Do NOT reproduce the old QAI structure
(Upload / Openworld / Report / Graphs / Timeline). The old app is described in
`docs/reference/legacy-user-manual-v2.0.pdf` for context only.

The prototype must be something **developers can build on**: real components, real routing,
real state handling, with **fake data behind a data layer** that developers later replace.
There is **no test engine** in this repo: no browser automation, no AI calls.

## Stack (fixed unless the user says otherwise)
- React 18 + TypeScript (strict) + Vite
- React Router for screens
- Tailwind CSS with design tokens from `docs/08-design-system.md`; shadcn/ui-style components copied into `src/components/ui`
- Icons: lucide-react (stroke icons). No emoji anywhere in the UI.
- Runs in the browser. Must stay Electron-compatible: no server, no Node APIs in UI code.

## Folder structure (create and keep it)
```
src/
  app/            # router, app shell (sidebar, top bar), providers
  screens/        # one folder per screen ID (see docs/03-navigation.md)
  components/ui/  # generic UI primitives (button, chip, tabs, table, dialog...)
  components/     # shared product components (StatusDot, ResultRow, StepList...)
  data/
    types.ts      # domain types: exactly docs/07-data-model.md
    api.ts        # the ONLY functions screens may call (async, return domain types)
    mock/         # fixtures + in-memory store used by api.ts
  lib/            # pure helpers (sorting, status rules, formatting)
```

## Non-negotiable rules
1. **Screens never import from `data/mock/`.** They call `data/api.ts` only. All api functions are async and typed.
2. **Use the glossary terms exactly** (`docs/02-glossary.md`) in code names and UI copy. Never use legacy terms in the UI (Copilot Mode, Openworld, Planner/Generator/Healer, Parameterize, Pixel diffing, Broken, Allure, Categories-as-failure-types).
3. **Business rules live in `src/lib/` as pure, tested functions** (status, pass rate, AI vs script decision, sorting, filters), each tagged with its rule ID from `docs/05-business-rules.md` (e.g. `// BR-RUN-03`).
4. **Build only what the spec says.** Items in `docs/09-parked.md` are NOT built. If something is unclear or missing, stop and ask; do not invent features, fields or screens.
5. **One consistent fake dataset** (`docs/07-data-model.md` § Sample data). Counts shown anywhere must be computed from the data, never hard-coded.
6. Every screen implements its **states**: normal, empty, loading, error (see each screen doc).
7. **Accessibility:** real `<button>`/`<a>`/`<input>` with labels; icon-only buttons have `aria-label`; colour is never the only signal (status also has icon or text); visible focus; text contrast ≥ 4.5:1.
8. Small, reviewable changes. After each slice: run the app, check the slice's acceptance list in `docs/11-build-plan.md`, then stop and report.
9. If a decision changes, update the relevant doc AND add an entry to `docs/12-decision-log.md` in the same change.

## Reading map
| Task | Read |
|---|---|
| Any task | `docs/00-README.md`, `docs/02-glossary.md` |
| App shell / routing | `docs/03-navigation.md` |
| A screen | `docs/screens/<file>.md` + rules it references in `docs/05-business-rules.md` |
| Data / api | `docs/07-data-model.md` |
| Styling | `docs/08-design-system.md` |
| What to build next | `docs/11-build-plan.md` |

## Commands
- `npm install` · `npm run dev` · `npm run build` · `npm run test` (Vitest for `src/lib`)

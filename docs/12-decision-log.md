# 12 · Decision log

| # | Decision | Why | Rejected alternatives |
|---|---|---|---|
| D1 | Full restructure; project-first: Projects → Overview · Suites · Runs · Knowledge · Project settings | Old menu mirrored the engine; tasks crossed sections | Keep Upload / Openworld / Report |
| D2 | Suites = library (definitions), Runs = evidence (results); each links to the other | Old screens mixed both; testers confused | One combined master–detail |
| D3 | Master–detail with draggable split; collapsible sidebar with edge toggle; brand links to All projects; no project switcher; theme only in Global settings | Professional pattern; deliberate project switching | Header dropdown; back button in collapsed rail |
| D4 | Tests can be written in-app or imported via a **fixed template** with lenient header matching; no column mapping | Market Excel formats are too varied to map | Column mapping wizard |
| D5 | Add a Preconditions field (matches ClickUp practice) | Team's real test case format | — |
| D6 | Batch runs; per-test AI vs script shown before running, with reason; Force AI | No surprises | Copilot Mode column |
| D7 | No cost/time estimates; cost shown per result and run | Estimates not technically feasible | Estimates |
| D8 | Statuses Passed / Failed / Couldn't complete / Not run; system problems excluded from pass rate | Old "Broken"/failures polluted pass rate | Allure statuses |
| D9 | Failure reasons each map to one action; users can't edit reasons but can override status with reason + proof | Labels must lead to action; audit trail | Editable categories |
| D10 | Result detail: plain failure summary; steps intent → actions → technical (toggle); failed step expanded | Raw agent code unreadable | Raw step list |
| D11 | Run results: flat list sorted by severity; summary counts are the status filter; reason filter depends on status; mode filter; bulk bar on selection; cost per row | Triage-first; less overload | Grouping by failure type or by suite |
| D12 | Suites list: status dot, search + latest-status filter only; "Latest result" is a one-line strip | Library should not duplicate triage | Status/mode/reason filters in Suites |
| D13 | AI explore: focused workspace via top-bar button; chats per project; approve once ("Add N tests"); tests land in Not in a suite marked New; user moves them | Single approval; user organises | Inbox + second approval; AI-chosen suites |
| D14 | Visual comparison: project-level on/off, compare with previous run, per-test exclude, ignore areas, flag never fail; pin reference parked | Bulk regression; approving baselines impractical | Per-test baselines with approval |
| D15 | Test data designed up front with {placeholders}; multiple fields; one field varied per negative row; one result with row breakdown | Matches QA practice; old flow was backwards | Parameterize from a result |
| D16 | Environment differences handled by separate test cases (Clone) | Simple, explicit | Environment variants; applies-to flags |
| D17 | Clone copies template fields + test data only; same title; placed after original; no dialog | User decides naming and placement | Suffixes, target pickers |
| D18 | Multi-browser: AI runs Chrome only; replays on selected browsers; one result with browser breakdown; data uniqueness per execution | Product behaviour; avoid ×3 noise | One result row per browser |
| D19 | Remove Graphs and Timeline | Mostly empty; not used by testers | Redesign them |
| D20 | Browser Use + Jev as optional cost saving in Welcome and Global settings; no test connection | Not widely known; optional | Always visible; connection test |
| D21 | Developer mode only in Global settings | Rarely used | Run options |
| D22 | Worth a look shown as a labelled proposal filter | Catches false passes; open to drop | Separate review mode |
| D23 | Prototype stack React + TS + Vite; fake data behind `api.ts`; own data model (not Allure-shaped) | Developers build on it; easy swap | Throwaway mock; Allure-shaped data |

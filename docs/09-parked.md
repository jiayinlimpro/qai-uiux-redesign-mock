# 09 · Parked (do NOT build now)

Kept for later, after the core is stable. Do not add UI for these unless marked "display only".

| Idea | Notes |
|---|---|
| **AI explore coverage model** | 3 layers chosen when creating tests: What to check (ISO/IEC 25010-based categories: functional flows, input validation, data & business logic, requirements completeness, roles & permissions, basic security, UI & design consistency, usability, accessibility, compatibility, basic performance) × How deep (ISTQB techniques: Quick / Standard / Thorough) × Where (page, suite, end-to-end flow, role). AI uses SFDIPOT internally. Limits: data logic only via UI; design needs a reference; completeness needs an FRS. |
| AI explore improvements | Environment selector; working state with Stop and progress; plan checklist before creating tests, with "View plan" on the plan card (Sprint 3 item 3-03); guided next-step buttons; header cleanup; top-bar background progress |
| Contextual AI entry points | "Explore this suite", "Plan tests from this document", "Draft steps with AI", side panel assistant, Ctrl+K |
| First-run review mode | Dedicated review beyond the Worth-a-look filter |
| More filters | Suite, source, overridden, known issue, browser; multi-select |
| Overview metrics | Pass-rate trend per run, coverage per suite, slowest tests. (The latest-status pass-rate donut and status-by-suite bars are built, D77.) |
| Pin a reference (visual) | Optional signed-off screenshot set as a third comparison (display-only card exists) |
| "Run on one browser only" per test | For data-creating tests (multi-browser side effects). Covered by Browser preference: a test that allows one browser replays only there (D53) |
| Release tags / run names | Free-text run note, later release comparison |
| ClickUp integration | Ticket creation; export results for execution tasks (today: Copy bug report only) |
| Scheduling / CI triggers | Runs are manual |
| Mobile web / native app targets | Keep "target" (browser + viewport) generic in the model |
| Credential security hardening | Encryption, masking policy (on hold) |
| Collaboration / shared workspace | Handover via export/import only |
| Test data file upload fields | |

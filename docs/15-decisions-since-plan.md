# 15 · Decisions since the plan that change or add scope

Decisions D24–D69 (`12-decision-log.md`) compared with the original spec. One line each: what changed and where.
**Changed** = the spec said something else. **Added** = the spec was silent or vague and the prototype now does it.
Decisions that only clarify wording or implementation, without changing scope, are listed at the end.

| ID | Type | Decision | Affects |
|---|---|---|---|
| D24 | Changed | Sample data rebuilt as a timeline of runs #1–#14 that follows the rules; several sample facts corrected | 07 § Sample data |
| D25 | Changed | AI explore findings start Not run with a badge until their first run, never counted as failed (now "Needs fixing", D65) | BR-EXPLORE-05 · 3.1 |
| D27 | Added | `Run.viewport` (1920×1080 for every run), shown read-only; comparison per browser + viewport | BR-VISUAL-02 · 6.2, 6.4 |
| D28 | Changed | Product bug vs Needs confirmation rule rewritten (clearly broken, or a linked document confirms it) | BR-REASON-05 · 6.1 |
| D29 | Changed | Proposal outcomes recorded after Add (superseded by D65) | BR-EXPLORE-05 · 3.4 |
| D30 | Changed | Add approves each proposed test once, pending ones can be added later (superseded by D65) | BR-EXPLORE-05 · 3.4 |
| D32 | Added | Global settings: toggles save at once, providers and keys with Save / Cancel; model list needs the key | BR-PROVIDER-01 · 2.3, 1.1 |
| D33 | Added | Remove an AI provider (never the last); affected projects switch model | BR-PROVIDER-02/03 · 2.3 |
| D34 | Added | Importing a project that already exists: Replace · Import as a copy · Cancel | BR-PROJECT-02 · 1.2 |
| D35 | Added | Unique project names; an imported clash becomes "<name> (2)" | BR-PROJECT-01 · 1.2, 1.3, 2.2 |
| D36 | Added | Runs keep a snapshot of their environment (name + app URLs) | BR-ENV-04 · 5.4, 6.1 |
| D37 | Added | Export project dialog with "Include account passwords" and a warning | 2.2 · open question 21 |
| D38 | Added | Limits for workers, max AI steps (warning above 100) and max actions per step | BR-RUN-12 · 2.2, 5.1 |
| D39 | Added | Document upload: required type, accepted file types and size limits | 2.1 |
| D40 | Added | Knowledge editing details: Show password on click, delete in the Edit dialog, skills' Used by, app removal confirm | 2.1 |
| D41 | Changed | Clones sort by ID (not after the original); copies are selected and highlighted | BR-CLONE-03 · 3.1 |
| D42 | Added | Moving T- tests renumbers them to the destination prefix; other IDs stay | BR-TEST-05 · 3.1 |
| D43 | Added | Create, rename and delete suites (name + ID prefix); only empty suites can be deleted | BR-SUITE-01/02 · 3.1 |
| D44 | Added | Test data saving: which edits create a version or reset the script; draft with "Save as vN+1" | BR-DATA-07 · 3.1 Test data |
| D45 | Added | Ignore areas get a drawn shape; "Not drawn yet" until drawn in Visual compare | BR-VISUAL-04 · 3.1 Visual check, 6.2 |
| D46 | Added | Delete tests with confirmation and Undo; results keep a snapshot of the test's ID and title | BR-TEST-06 · 3.1, 6.1 |
| D47 | Added | Changing a row-1 value offers to update the rows that used the old value | BR-DATA-08 · 3.1 Test data |
| D48 | Added | Import reads CSV for real; Excel simulated and labelled "Prototype" | BR-IMPORT-01 · 3.3 · open question 22 |
| D49 | Added | Test data fields follow the steps' {placeholders} on save, announced before saving | BR-DATA-09 · 3.2 |
| D50 | Added | Import Update rules (missing column keeps, empty cell clears), new suite prefixes, repeated IDs, rows without steps | BR-IMPORT-05/08/09 · 3.3 |
| D51 | Added | Edit test: More options (description, start page, browser preference) and a leave guard | 3.2 |
| D52 | Added | Data layer for New test and Import (createTest, importTemplate, importCheck, importCommit) | 07 · 3.2, 3.3 |
| D53 | Added | Browsers per test from the browser preference; a test with no allowed browser is Not run | BR-RUN-13 · 5.1 (covers the parked "run on one browser only") |
| D54 | Changed | Narration panel keeps only Skip test; Stop test removed | BR-RUN-14 · 5.2 |
| D55 | Changed | Stop run ends the run as Completed "Stopped at x/y", cannot resume; the rest re-run from results | BR-RUN-15 · 5.2, 5.3, 5.4, 6.1 |
| D56 | Added | New run from the Runs list runs All tests (including Not in a suite) | 5.4, 5.1 |
| D57 | Added | Pre-flight inside the run dialog: block stops, warnings offer Start anyway | BR-RUN-09 · 5.1 |
| D58 | Added | Optional result evidence fields (steps source, tokens, knowledge used, logs, URL, locator, AI thought); "Not recorded" when empty | 07 · 6.1 |
| D59 | Added | Looks fine stored with who and when, with Undo; dismissed flags not counted | BR-VISUAL-03 · 6.2 |
| D60 | Added | Run results gaps closed: Not run rows for stopped runs, re-run prefills, bug report fields, Add area flow (parts amended by D62, D63) | 6.1–6.4, 3.1 Visual check |
| D61 | Added | Rule 10: results are frozen records; human decisions stored with who and when | CLAUDE.md · 07 |
| D62 | Changed | Overrides kept as history; the newest applies; earlier ones under History | BR-STATUS-05, BR-ACTION-01 · 6.1, 6.3 |
| D63 | Changed | Copy bug report for Failed results only; Known issue also in the result detail's More menu | BR-ACTION-02/03 · 6.1, 6.4 |
| D64 | Added | Optional changed regions for visual changes; placeholder positions without them | BR-VISUAL-02/03 · 6.2 · open question 23 |
| D65 | Changed | Ready for Suites tray replaces approval in the chat: AI cases with a validation status, Discard, Move to Suites; library-only listing | BR-EXPLORE-03…09 · 3.4, 3.5, 3.1, 1.4, 5.1 |
| D66 | Added | Prototype AI turn simulated and labelled, writing 3 demo cases | BR-EXPLORE-02 · 3.4 |
| D67 | Changed | Overview banner offers Resume · Stop run (not Discard) | BR-RUN-15 · 1.4 |
| D68 | Added | Ready for Suites gaps closed (replaced cases, Undo limits, tones, Overview table details) | 3.5, 1.4 |

**Clarifications without a scope change**: D26 (hash addresses, all routes in `routes.ts`), D31 (the breadcrumb shows
pages, not selections), D69 (the banned legacy "Upload" means test-file upload; Knowledge keeps "Upload").

# Screens · Suites (test library)

## 3.1 Suites
**Purpose** The library: what we test. NOT a results screen (results live in Runs).
**Layout** Master–detail with draggable split (BR-LIST-05).

### Left: list
- Header: "Suites" · New test · Import · (when selection) **Move to suite… · Clone · Run N selected** (primary).
- Search (ID or title) · Latest status filter (All / Passed / Failed / Couldn't complete / Not run) · count text · Clear filters.
- Tree: suite rows (checkbox selects visible tests, expand/collapse arrow, name, "<n> tests"); test rows (checkbox, ID, title, **New** badge if applicable, **Likely bug** badge if applicable (BR-EXPLORE-05), **status dot** with text label for screen readers and tooltip).
- "Not in a suite" group last (tests from AI explore or imports without category).
- With a filter active, suites with matches auto-expand and show "<n> match".
Status dot colours: passed green, failed orange-red, couldn't complete amber, not run hollow grey ring.

### Right: test detail
- Breadcrumb "<suite> › <ID>", title, chips: version (vN), Source (CSV import / Written / AI explore), Script (recorded / none yet / none: last AI run failed / reset after edit). **Likely bug** badge until the test's first run, with tooltip "Found during AI explore, not yet confirmed by a run" and link "View in AI explore" (BR-EXPLORE-05).
- Actions: Run (primary) · Edit · Clone · More (Move to suite, Mark known issue, Delete).
- **Latest strip** (one line): "Latest" + status chip + reason chip + "Run #12 · UAT · Chrome · 16 Oct" + **Open result** link. (No full result here.)
- Tabs:
  1. **Definition**: Preconditions · Steps (numbered) · Expected result · Expected keywords (if any) · Linked knowledge (chips + Link…).
  2. **Test data**: see below.
  3. **Visual check**: "Visual comparison: on for this project" (or off, linking to Project settings) · checkbox **Exclude this test** · latest comparison table (Step · Result: No change / n areas changed / No previous run · Compare → 6.2) · Ignore areas (chips + Add area) · dashed card "Pin a reference — Later" [PARKED, display only, disabled].
  4. **History**: Run · Date · Environment · Version (with "old version" chip) · Mode · Browser(s) · Result (+ "Overridden" marker) — run number links to 6.1.

### Test data tab
- Help: "Each row replays the test with different values. The first row is recorded by AI; the others replay the script."
- Fields header: "Fields: {name} · {email} · {topic}" and the convention note (BR-DATA-04).
- Table: Use · Row (1 · recorded) · one column per field (varied value bold) · Expected (Accepted/Rejected) · Page shows · Last result.
- Buttons: Add row · Suggest rows (panel: Boundary values, Equivalence classes, Pairwise; note about linked FRS / hint).
- Empty state: "No test data. Add {field} placeholders to the steps to use test data." + Edit steps.
- Footer: "Counts as one result: passes only if every row meets its expectation (k/n rows)."

**States** Empty library: "No tests yet" + Import · New test · Explore with AI. No selection: "Select a test to see its details".

## 3.2 New / edit test
**Layout** List on the left (compact, current test highlighted) + editor form on the right.
**Header** Context line: "Editing · <suite> › <ID> · vN → vN+1" or, when opened from a result, "Opened from Run #12 result · …". Buttons: Cancel · Save as vN+1 · **Save and re-run** (primary, only when opened from a result → run dialog prefilled).
**Warning banner** (only when a reset field changed, BR-SCRIPT-02): "You changed the steps. Saving resets the recorded script and visual history; the next run of this test uses AI."
**Fields** Test ID (BR-TEST-01) · Suite (select, includes "Not in a suite") · Title · Preconditions · Steps (one input per step, Add step, reorder, delete; hint "Use {field} to insert values from Test data") · Expected result · More options (collapsed): Text that must appear (expected keywords; `|` = or, `&` = and, case-sensitive), Linked knowledge.
**Validation** Steps required; ID unique.

## 3.3 Import (dialog)
**Steps** 1 File · 2 Check · 3 Review.
- Step 1: Choose CSV/XLSX + **Download template**.
- Step 2 (file check): "<n> rows read · all required columns found" · Recognised columns list · Ignored columns list · note on lenient matching (BR-IMPORT-02) · duplicate handling radio (BR-IMPORT-06) · note "Suites are created from the category column; rows without a category go to Not in a suite."
- Step 3: preview of suites and test counts to be created/updated → Import.
**Errors** No `task_content` column → blocking error with link to the template. Wrong file type → "Choose a .csv or .xlsx file".
**Prototype** Parsing can be simulated with the seed CSV (`docs/fixtures/qcfixer-tests-seed.csv`).

## Clone (no dialog)
Clone from detail or selection → copies inserted after originals (BR-CLONE). Toast: "<n> tests cloned" with Undo.

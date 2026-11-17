# Screens · Suites (test library)

## 3.1 Suites
**Purpose** The library: what we test. NOT a results screen (results live in Runs).
**Layout** Master–detail with draggable split (BR-LIST-05).

### Left: list
- Header (D80): "Suites" · Import (icon-only, "Import tests") · **New suite** (Suite dialog, see below) · **New test** (primary, last). When tests are ticked, the **bulk bar** floats at the bottom centre: "<n> selected" · **Move to suite… · Clone · Run N selected** (primary) · Clear (×); the header does not change.
- Search (ID or title, with icon) · **Latest status** segmented control with counts, worst first: All n · Failed n · Couldn't complete n · Passed n · Not run n (status icons; each option's accessible name says the status and count; counts computed from the latest statuses, D80) · count text · Clear filters.
- Tree: suite rows (checkbox selects visible tests, mixed when some are selected; expand/collapse arrow, folder icon, name, **pass/fail bar** of its tests' latest statuses with the counts as its accessible name (D80), "<n> tests"; ⋯ menu: **Edit suite (Suite dialog) · Delete suite**, only when empty, otherwise "Move or delete its tests first.", BR-SUITE); suites start collapsed, the selected test's suite opens; test rows (checkbox, ID, title, **New** badge if applicable, **Likely bug** badge if applicable (BR-EXPLORE-05), **status icon** (✓ / ✕ / ! / ○) with text label for screen readers and tooltip; ID in monospace).
- "Not in a suite" group last (tests moved from Ready for Suites, or imports without category); hidden when empty. The tree shows library tests only (BR-EXPLORE-07): AI cases still in Ready for Suites or discarded never appear.
- An empty suite shows "0 tests"; opened, it shows "No tests yet. Create a New test, or select tests and use Move to suite…" (New test is a link).
- **Move to suite…** (dialog): an existing suite · Not in a suite · **New suite…** (the Suite dialog's name + ID prefix fields shown inside the Move dialog, since dialogs never open on top of dialogs; the suite is created on Move). Tests from Not in a suite get the destination prefix (T-01 → CNT-05); other IDs stay (BR-TEST-05).
- With a filter active, suites with matches auto-expand and show "<n> match".
Status colours: passed green, failed orange-red, couldn't complete amber, not run hollow grey ring; each status also has its own icon shape.

### Right: test detail
- First line: the suite (folder icon) and the actions; then "<ID> <title>" (ID in monospace) at full width; chips with icons: version (vN), Source (CSV import / Written / AI explore / Clone of <ID>), Known issue (when marked), Script (recorded / none yet / none: last AI run failed / reset after edit). **Needs fixing** badge (AI cases moved with that validation status) until the test's first run, with tooltip "AI explore could not make this test pass (the fix failed or the site looks broken). Not yet confirmed by a run." and link "View in AI explore" (BR-EXPLORE-05, D65).
- Actions (D80), primary last: Edit · Clone · More (⋯: Move to suite, Mark known issue, Delete) · **Run** (primary).
- **Latest result card** (one line, D80): status tile (icon on its tint) · "Latest result" · status + reason chip + "Run #12 · UAT · Chrome · 16 Oct" (environment from the run snapshot, BR-ENV-04) · **Open result →**. (No full result here.) A multi-browser latest result shows each browser with its status icon instead of the names. **By browser** (D86), on a second line when the test has results in more than one browser: each browser's most recent result, e.g. "✓ Chrome · #13 UAT · ✓ Firefox · #7 Prod · ✕ Safari (WebKit) · #7 Prod"; each opens that result with that browser selected. The test's status stays its latest result (unchanged). Never run: "Not run · This test hasn't run yet."
- The open tab is in the address (`?tab=`); ←/→ move between tabs.
- Tabs (with icons):
  1. **Definition**: Preconditions · Steps (numbered) · Expected result · Expected keywords (if any) · Linked knowledge (chips + Link…). Chips show items linked to the test and items that apply through their Knowledge scope (project-wide, its suite, this test). **Link…** links documents/skills to the test (new version, no script reset, BR-VERSION-01).
  2. **Test data**: see below.
  3. **Visual check**: "Visual comparison: on for this project" (or off, linking to Project settings) · checkbox **Exclude this test** · latest comparison "Run #N vs Run #M" (newest script replay vs the previous replay on the same environment; table Step · Result: No change / n areas changed / No previous run · Compare → 6.2 on that step) · Ignore areas (chips with remove + Add area: step + name; an area without a drawn shape shows **"Not drawn yet"** and leaves nothing out of the comparison, D45. **Add area** saves the area and opens 6.2 Visual compare on that step to draw it; an area not drawn yet has **Draw** when that step has a screenshot in the latest comparison) · dashed card "Pin a reference — Later" [PARKED, display only, disabled]. Visual settings save at once, no new version. When the latest replay ran in several browsers, a **Browser** switcher picks whose comparison is shown (each browser is compared with its own previous replay, BR-VISUAL-02; D86).
  4. **History**: Run · Date · Environment · Version (with "old version" chip) · Mode · Browser(s) (each with its status icon, D86) · Result (+ "Overridden" marker) — run number links to 6.1.

### Test data tab
- Help: "Each row replays the test with different values. The first row is recorded by AI; the others replay the script."
- Fields header: "Fields: {name} · {email} · {topic}" and the convention note (BR-DATA-04).
- Table: Use · Row (1 · recorded) · one column per field (varied value bold) · Expected (Accepted/Rejected) · Page shows · Last result.
- Buttons: Add row · Suggest rows (panel: Boundary values, Equivalence classes, Pairwise; note about linked FRS / hint).
- Empty state: "No test data. Add {field} placeholders to the steps to use test data." + Edit steps.
- Footer: "Counts as one result: passes only if every row meets its expectation (k/n rows)."
- **Changing row 1** (BR-DATA-08, D47): when a row-1 value changes, ask "Also update <n> rows that used the old value '<value>'?" (default **Yes**, Enter accepts; "No, keep them"), so rows keep varying only their intended field. Rows that vary more than one field show a gentle note.
- **Saving** (BR-DATA-07, D44): "Use" saves at once (no new version). Other edits (Add row, Edit row, Delete row 2+, Suggest rows) are a draft with a bar "Save as vN+1 · Cancel"; when fields or row 1 change and the test has a recorded script, the bar shows the reset warning. Row 1 cannot be deleted. Suggested rows are marked "Suggested"; suggesting again replaces them and keeps rows people added.

**States** Empty library: "No tests yet" + Import · New test · New suite · Explore with AI. No selection: "Select a test to see its details".

### Suite dialog (D78)
One dialog to create or edit a suite, opened from: Suites header **New suite**, the empty library's **New suite**, the Suite field's **New suite…** in New / edit test (3.2), and the suite row menu's **Edit suite**.
- Title "New suite" / "Edit suite". Fields: **Suite name** · **ID prefix** (suggested from the name until edited). Hint: "Used for test IDs, e.g. CHK-01." / "Existing test IDs stay; new tests use this prefix."
- Buttons: Cancel · **Create suite** / **Save**. Validation inline (BR-SUITE-01).
- Create mode creates the suite at once, empty. From the Suites header: toast "Suite <name> created"; filters that would hide it are cleared; the suite opens and scrolls into view. Edit mode: toast "Suite saved as <name>".

## 3.2 New / edit test
**Layout** List on the left (compact, current test highlighted) + editor form on the right.
**Header** Context line: "Editing · <suite> › <ID> · vN → vN+1" ("→ vN+1" only when the change creates a version), "New test · <suite> › <ID>", or, when opened from a result (`?from=<resultId>`), "Opened from Run #12 result · …" with a link to that result. Buttons: Cancel (back to the result, the test, or Suites) · Save as vN+1 ("Save" when the change creates no version; "Create test" for a new test) · **Save and re-run** (primary, only when opened from a result → run dialog prefilled). After saving: the test detail with "Saved as vN" / "Created <ID>".
**Warning banner** (only when a reset field changed and the test has a recorded script, BR-SCRIPT-02): "You changed the steps. Saving resets the recorded script and visual history; the next run of this test uses AI."
**Test data note** (D49, before saving): "Test data: adds {x}." / "Test data: removes {email} and its values in <n> rows." Renaming a placeholder is a removal + an addition, so both lines show.
**Fields** Test ID (BR-TEST-01; for a new test it follows the chosen suite's prefix until edited; an existing T- test follows BR-TEST-05 when its suite changes) · Suite (select, includes "Not in a suite" and **New suite…**, which opens the Suite dialog over the editor; on Create suite the new suite is selected and the Test ID follows its prefix, the rest of the form is kept; Cancel changes nothing) · Title (empty → the first 40 characters of the first step, shown as a hint) · Preconditions · Steps (one input per step, Add step, reorder, delete; hint "Use {field} to insert values from Test data") · Expected result · More options (collapsed, D51): **Description** · **Start page** (empty → the platform's URL for the run's environment) · **Browser preference (for replays)** (none ticked → the run dialog's browsers; AI runs always use Chrome) · Text that must appear (expected keywords; `|` = or, `&` = and, case-sensitive) · Linked knowledge. Every field that affects a run is visible and editable.
**Test data** Saving keeps the Test data fields in sync with the steps' {placeholders} (BR-DATA-09, D49).
**Validation** Steps required; ID unique.
**Leaving** with unsaved changes asks "Discard your changes?" (Keep editing / Discard changes) (D51).

## 3.3 Import (dialog)
**Steps** 1 File · 2 Check · 3 Review.
- Step 1: Choose CSV/XLSX + **Download template** (CSV with the template columns and an example row). Prototype only: "Use the sample file" (the 83 qcfixer.com tests).
- Step 2 (file check): "<n> rows read · all required columns found" · Recognised columns list · Ignored columns list · note on lenient matching (BR-IMPORT-02) · duplicate handling radio (BR-IMPORT-06), shown when rows match existing test IDs · with Update: "<n> fields will be cleared" when the file has empty cells over existing values (D50) · rows without steps and repeated IDs listed (BR-IMPORT-08) · note "Suites are created from the category column; rows without a category go to Not in a suite."
- Step 3: preview per suite ("New suite" marked) with new / updated counts, Not in a suite last, skipped rows and cleared fields → Import. After importing: Suites with "Imported: …".
**Errors** No `task_content` column → blocking error with link to the template. Wrong file type → "Choose a .csv or .xlsx file".
**Prototype** CSV is parsed for real. Excel needs a spreadsheet library the prototype doesn't include, so an .xlsx/.xls file is read as the seed CSV (`docs/fixtures/qcfixer-tests-seed.csv`) with the note "Prototype: Excel files are read as the sample test set." (D48; real platform: open question 22).

## Clone (no dialog)
Clone from detail or selection → copies created with new IDs, sorted by ID; they are selected, scrolled to and highlighted (BR-CLONE-03, D41). Toast: "<n> tests cloned" with Undo.

## Detail actions
More › Move to suite · Mark known issue (optional note + ticket reference; chip "Known issue") / Remove known issue · **Delete**: the confirmation lists what is affected (e.g. "2 documents are scoped to this test; they stay in Knowledge but will apply to no test", "4 results stay in their runs and keep showing CNT-04 …"); after deleting, the toast offers **Undo**, which restores the test with its ID (BR-TEST-06, D46). Run and Run N selected open the run dialog (Slice 6).

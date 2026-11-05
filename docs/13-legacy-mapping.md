# 13 · Legacy QAI → new design

Legacy references are sections of `reference/legacy-user-manual-v2.0.pdf`.

| Legacy feature (manual §) | New home / status |
|---|---|
| Section picker: Report, Graphs, Timeline, Upload, Openworld (2.2) | Project shell nav; Graphs & Timeline removed |
| LLM provider, key, model (2.3, 3.1) | Welcome (first launch) + Global settings › AI providers; model default per project, override per run |
| Max actions per step, max steps (3.2) | Project settings › Run defaults; run dialog › Advanced |
| Developer mode (3.2) | Global settings › Advanced |
| Headless, parallel + workers (3.2) | Project run defaults; run dialog › Advanced |
| Pixel diffing (3.2, 6) | Visual comparison: project setting; per-test exclude; viewer 6.2 |
| Load browser extension (3.2) | Project settings › Browser |
| Browser type (SCRIPT) (3.2) | Run dialog › Browsers |
| Script validation (3.2) | System behaviour (always on), no user setting |
| Retry after failed (3.2) | System auto-retry for system causes only [DEV-CONFIRM] |
| Failure classification toggle (3.2) | Always on (failure reasons) |
| Browser Use + Jev (3.2) | Optional cost saving (Welcome, Global settings) |
| Backup & reset (3.3) | Global settings › Data; project export/import |
| Skills (4) | Knowledge (scoped: project / suite / test) |
| Upload task file, editable table (5.2–5.3) | Import (template) + Suites + Edit test |
| task_id, task_content, expected_result, title, description, category | Test ID, Steps, Expected result, Title, Description, Suite |
| base_url | Start page; App URL per environment |
| credentials | Knowledge › Accounts (by role) |
| expected_keywords | Text that must appear (More options) |
| Copilot Mode | Automatic mode + Force AI |
| Skill / extension_path / llm_provider / model_name columns | Linked knowledge / project setting / run model |
| Run, pause, cancel, progress (5.4) | Run dialog, Live run (narration), Paused/Interrupted run |
| Report results tree, attachments (5.5, 9) | Run results + result detail (tiers) |
| Parameterized tests (7) | Test data tab + Data rows mode |
| Openworld Planner/Generator/Healer, artifacts, chats (8) | AI explore (agents invisible; validation at creation) |
| Open in Upload tab (8.9) | Removed: Add N tests to Suites |
| Select / retry / delete (9.3) | Bulk bar in Run results; delete in Suites |
| Failure types (9.5) | Failure reasons (BR-REASON) |
| Graphs, Timeline (9.6) | Removed |
| Flaky, Transition, Tags, Categories filters | Removed; replaced by status / reason / mode filters |
| Allure report | Replaced by Runs and Run results; Allure only as optional export (engine choice) |

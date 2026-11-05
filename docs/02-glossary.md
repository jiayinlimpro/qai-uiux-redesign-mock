# 02 · Glossary

Use these terms exactly, in code and UI. One term = one meaning.

| Term | Definition | Notes |
|---|---|---|
| **Project** | One client system under test (may contain several apps). Top-level container for everything below. | Created by the user. Exported/imported for handover. |
| **App** | One application inside a project, e.g. "Customer website", "Admin portal". | Defined in Knowledge. |
| **Environment** | A named deployment of the project's apps, e.g. Dev, UAT, Prod. **Names and number are user-defined per project.** | Each App has a URL per Environment (may be empty). A run uses exactly one environment. |
| **Account** | Login for a role in an app and environment (role, app, environment, username, password). | Tests refer to roles in plain language ("log in to Admin portal as Admin"); the AI resolves URL + account for the run's environment. |
| **Knowledge item** | Anything the AI may read: Document (FRS, user stories…) or Skill (instructions, codebase, reference file). Has a **scope**: project, suite or test. | Apps/Environments/Accounts are also edited on the Knowledge screen. |
| **Suite** | A group of test cases, normally one module or function area (e.g. "09 Contact Us"). The test library. | NOT a result grouping. A test belongs to at most one suite. |
| **Not in a suite** | The place in the Suites list for test cases without a suite (added from AI explore, or imported without a category). | Tests here are normal, runnable tests. |
| **Test case** (test) | One check: ID, title, preconditions, steps, expected result, optional expected keywords, optional test data, linked knowledge. Has a **version** number. | The central object. |
| **Step** | One numbered line of a test case's steps, written by the user (or derived by AI). Shown in results as an **intent step**. | |
| **Action** | A low-level browser action performed during a step (click, type…). Shown under its step. | |
| **Test data** | A table of **fields** ({placeholders} used in steps) and **rows** of values, each row with an expected outcome. | Row 1 = recorded row. |
| **Script** | The recorded, replayable automation of a test case, produced by a passing AI run. Invisible plumbing for most users. | Reset when the test's steps/preconditions/expected/test data change. |
| **AI run** | A test execution performed by the AI agent (always in Chrome). Records a script if it passes. | Mode label: "AI". |
| **Script replay** | A test execution that replays the recorded script, no AI. Any selected browser. | Mode label: "Script". |
| **Data rows** | Execution of a test once per test-data row (row 1 by AI if no script, others replayed). | Mode label: "Data rows". |
| **Run** | One execution of a selection of test cases, in one environment, with chosen browsers and model. Numbered (#12). | States: Running, Paused, Interrupted, Completed. |
| **Result** | The outcome of one test case in one run. Has a status, optional failure reason, evidence, cost. | Multi-browser and data rows roll up into one result. |
| **Status** | Passed · Failed · Couldn't complete · Not run. | See BR-STATUS. |
| **Failure reason** | Why a result failed or couldn't complete. Set by the system. | See BR-REASON. Users cannot edit it. |
| **Override** | A user's manual change of a result's status, with mandatory reason and proof. The AI verdict is kept. | |
| **Known issue** | A user mark on a test/result: failing for a known, reported reason. | Still runs and is recorded. |
| **Visual comparison** | Project-level option: script replays compare screenshots at the end of each step with the **previous run** of the same test. Differences are **flagged, never failed**. | Per-test exclusion; ignore areas. |
| **Ignore area** | A region of a step's screenshot excluded from visual comparison (rotating banners, counters). | Per test. |
| **AI explore** | The workspace where the user chats with the AI to explore an app or plan from documents and get **proposed tests**. | Chats belong to a project. |
| **Proposed test** | A test produced in an AI explore chat, not yet added. Has a validation badge: Validated, Likely bug, Needs attention. | Becomes a normal test (in "Not in a suite") when the user clicks Add. |
| **Pre-flight check** | Quick checks after Start run and before tests execute (key, site, browser). | [DEV-CONFIRM] |
| **Worth a look** | A flag on results whose verdict may be wrong (e.g. passed using almost all AI steps). | [PROPOSAL] |
| **Clone** | Copy test case(s): template fields + test data only. | See BR-CLONE. |

## Never use in the UI (legacy terms → new term)
| Legacy | Use instead |
|---|---|
| Upload / task file / task | Import / test case |
| Copilot Mode TRUE/FALSE | Run mode (AI run / Script replay), "Force AI" |
| Openworld, Planner, Generator, Healer | AI explore (agents are invisible) |
| Artifacts | (not shown; plans/files live inside a chat) |
| Parameterize / Parameterized / PARAM | Test data / Data rows |
| Pixel diffing, baseline (as approval) | Visual comparison, previous run |
| Broken | Couldn't complete |
| Categories (for failure types) | Failure reason |
| Report / Graphs / Timeline | Runs / Run results (Graphs and Timeline removed) |
| Skills (as global files) | Knowledge (scoped) |
| category (CSV column) | Suite |

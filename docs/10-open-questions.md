# 10 · Open questions for engine developers

The prototype assumes the answers in "Assumed". Each links to the rules that depend on it.

| # | Question | Assumed in prototype | Rules |
|---|---|---|---|
| 1 | **Does a script replay verify the expected result, or only repeat actions?** (critical) | It verifies | BR-SCRIPT-03 |
| 2 | Can one runner execute both recorded scripts (closed-world) and AI-explore generated tests, and repair them the same way? | Yes, one format | BR-EXPLORE-06 |
| 3 | Can a failed script replay automatically fall back to an AI run that records a new script? | Yes | BR-RUN-07 |
| 4 | Can automatic retry be limited to system causes (rate limit, timeout, provider error)? Today "Retry after failed" retries everything. | Yes | BR-RUN-06 |
| 5 | Is a pre-flight check (key/model, site reachable, browser launch) feasible before a run? | Yes | BR-RUN-09 |
| 6 | Can progress be saved per test so interrupted runs resume? Today: unknown after a crash. | Yes | BR-RUN-10 |
| 7 | Can the run auto-pause on provider outage / unresponsive environment? Today the run continues and fails remaining tests. | Proposed | BR-RUN-11 |
| 8 | After an AI run passes in Chrome, can other selected browsers replay the new script in the same run? | Yes | BR-RUN-03 |
| 9 | Are scripts environment-independent (base URL swapped per environment)? | Yes for same-app URLs | BR-ENV-02 |
| 10 | Can test data placeholders `{field}` be linked to recorded inputs at recording time (keeping today's after-the-fact detection as fallback)? | Yes | BR-DATA-* |
| 11 | Visual comparison: must pixel-diff tests still run one at a time after others? (If so, project-wide "on" slows runs.) Comparison per step needs stable step identity. | No serial constraint | BR-VISUAL-* |
| 12 | Can the narration panel attach beside the test browser without changing the page or appearing in screenshots? | Yes when headless off | 5.2 |
| 13 | Failure reason detection: signals for each reason (e.g. Product bug vs Needs confirmation using linked documents). | As listed in BR-REASON | BR-REASON-* |
| 14 | Multi-browser runs create duplicate data. Agreed approach: unique values per execution; some cases need the AI to handle data smartly (e.g. recognise "already exists"). | Unique values | — |
| 15 | Duplicate detection for AI-proposed tests: method (AI comparison or text similarity)? | AI comparison | BR-EXPLORE-04 |
| 16 | Storage and retention of screenshots (local disk) | Keep latest 10 runs per test | BR-VISUAL-02 |
| 17 | What exactly does Browser Use + Jev do and cost? Confirm settings (TypeSafe key, model, reasoning). | Optional cost saving | 1.1, 2.3 |
| 18 | Where is cost computed and can it be shown live during a run? | Yes | BR-RUN-05 |
| 20 | Will users choose the screen size (viewport) for a run, and which sizes? | No: every run is 1920×1080; `Run.viewport` exists and is shown read-only (D27) | BR-VISUAL-02 |
| 21 | Should exported project files be encrypted (they can contain account passwords in readable form)? | No: plain file; "Include account passwords" option with a warning (D37) | D37 |
| 19 | Result storage: keep Allure only as an optional export; QAI stores results in its own model (07). | Own model | 07 |

# Screens · 3.4 AI explore

**Purpose** Create tests with AI by exploring an app or planning from documents. Agents (planner / generator / validator) are invisible to the user.
**Layout** Focused workspace (no project sidebar):
- Header: ← Back to project · "AI explore" · project name.
- Left (chat list): New chat (primary) · "This project" list; each chat: title, date, **Running** badge if an AI turn is active (BR-EXPLORE-02).
- Right: conversation, composer at bottom.

**Conversation elements**
- User messages; AI messages; **plan summary card** ("2 suites · 5 scenarios · View plan"; "Explored 4 pages on UAT · used: <knowledge items>").
- **Tests ready card**: header "<n> tests ready · Created and validated"; one row per proposed test: checkbox · title · validation badge (Validated / Likely bug / Needs attention) · duplicate warning with inline Keep both / Replace existing / Skip · **View** (preview of steps and expected result in a side sheet). Needs attention unticked by default. Footer note "Ticked tests go to Suites under Not in a suite, marked New." Primary button **Add N tests to Suites** (N = ticked) → navigate to 3.1.
- Composer: message textarea · starter chips (Explore · Plan from documents · Create tests) · knowledge chip ("Knowledge: n items") · Attach · Send.

**Not built now** [PARKED]: environment selector, working state with Stop and live progress, plan checklist before creating tests, guided next-step buttons, context launches from suites/documents.
**States** Empty chat: short intro + starter chips. AI working (prototype): simulated "Exploring…" message with spinner. Error: "AI provider unavailable" inline with Retry.

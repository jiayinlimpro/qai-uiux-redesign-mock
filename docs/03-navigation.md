# 03 · Navigation and app shell

## Two shells
### A. Outside a project (Welcome, Projects, Global settings)
- **Welcome** has no shell (centered card).
- **Projects** has the same masthead as the project shell (menu button + QAI brand, no breadcrumb, no actions) and a slim app sidebar under it: "Projects" (active), Global settings pinned **bottom-left**. It collapses to the same 64 px icon rail as the project sidebar and shares its remembered state (D74).
- **Global settings** page: header with "← Back" (returns to Projects) and title.

### B. Inside a project (every project screen except AI explore)
```
EXPANDED
┌─────────────────────┬──────────────────────────────────────────────────────┐
│ ≡   [▷] QAI         │ All projects / qcfixer.com / Suites    [✦ AI explore] │ ← masthead
│                     ├──────────────────────────────────────────────────────┤
│ ⌂   Overview        │                                                      │
│ ☰   Suites          │                    screen content                    │
│ ▷   Runs            │                                                      │
│ ▤   Environments    │                                                      │
│ ▢   Knowledge       │                                                      │
│ ⚌   Project settings│                                                      │
│ ─────────────────── │                                                      │
│ ⚙   Global settings │                                                      │
└─────────────────────┴──────────────────────────────────────────────────────┘
COLLAPSED
┌─────┬────────────────────────────────────────────────────────────────────────┐
│ ≡     [▷] QAI         All projects / qcfixer.com / Suites    [✦ AI explore] │
│     └────────────────────────────────────────────────────────────────────────┤
│ ⌂   │                                                                        │
│ ☰   │                           screen content                               │
│ …   │                                                                        │
```
**Masthead (D74; the YouTube / Outlook desktop pattern)**
- **Static**: the masthead has the sidebar's background and nothing in it moves or changes when the sidebar collapses or expands (as on YouTube): **menu button** "≡" (centred on the sidebar's icon column), QAI brand mark + "QAI", then the breadcrumb, which starts where expanded content starts, and AI explore on the right. No divider lines inside the masthead.
- **Only the line under the masthead moves**: it starts at the sidebar's edge and meets the sidebar's right border in one corner. So "≡" never has a line under it (it reads as the top of the sidebar); the brand has no line under it when expanded (top of the sidebar) and a line under it when collapsed (top of the page), without moving.
- **The brand is a link to All projects** (tooltip "All projects").

**Sidebar (under the masthead)**
- Nav items with icon + label: Overview, Suites, Runs, **Environments**, Knowledge, Project settings (Environments above Knowledge, D72). Active item highlighted. No project card (D75: the breadcrumb names the project and leads to All projects).
- Bottom (separated): Global settings. (Theme is NOT here; it is in Global settings.)
- **Geometry (D74)**: every row is 40 px high in both states and every icon sits on one column centred 32 px from the window edge, the same column as "≡". Expanding or collapsing never moves an icon or a row; only the labels appear or disappear.
- **Collapse/expand** (D74): the masthead's menu button. Tooltip names the shortcut ("Collapse sidebar (Ctrl+B)"; ⌘B on Mac). **Ctrl+B / ⌘B** toggles the sidebar (ignored while typing in a field or while a dialog is open). `aria-label` "Collapse sidebar" / "Expand sidebar", `aria-expanded`.
- Collapsed = **64 px icon rail**: icons only; each label stays the link's accessible name and shows as a tooltip on hover and keyboard focus. **No separate back button when collapsed.**
- Collapsed state is remembered across screens and app restarts (localStorage).

**Top bar (the masthead after the brand)**
- Left: breadcrumb `All projects / project name / section / item` (e.g. `All projects / qcfixer.com / Runs / Run #12`), one line (D75). Each crumb except the last is a link: **All projects** → Projects, the project name → Overview.
  **The breadcrumb shows pages, not selections inside a page** (D31). Pages such as `Run #12`, `Edit test`, `New test` are items (`All projects / qcfixer.com / Suites / New test`). Selecting a test in Suites or a result in Run results does **not** change the breadcrumb; the detail header shows the selection. Dialogs (New project, Import) do not change it either.
- Right: **AI explore** primary button (sparkle icon). Nothing else (no project switcher, no settings, no theme).

### C. AI explore workspace (focused)
Replaces the whole window: header `≡ · ← Back to project · AI explore · <project name>`, the same static masthead as the project shell (D74), in the chat list's colour: "≡", **Back to project** and the title never move; only the line under it follows the chat list's edge. Left = chat list of this project and, under the chat history, always visible, **Ready for Suites (n)** (opens 3.5, a large centre modal); right = chat. No project sidebar. "≡" (and Ctrl+B / ⌘B) collapses the chat list to a 64 px icon rail (New chat, Ready for Suites with its count; tooltips), remembered separately (D71, D74). Rows keep the 40 px height and icon column of the project sidebar.
**Back to project** returns to the project screen AI explore was opened from (still true after switching chats); if AI explore was opened directly (no previous screen), it goes to the project's Overview.

### Not found and error screens
- **Project not found** (deleted project, out-of-date link): message + **All projects**.
- **Something inside a project not found** (e.g. a deleted test or run), or an unknown address / crashed screen while the project still exists: message + link to **that project's Overview**. If the project no longer exists: **All projects**.
- **Retry** is shown only for loading errors (data could not be loaded), never for "not found" or a crashed screen.

## Screens and routes
**Hash addresses** (D26): every route below is served after `#`, e.g. `#/p/:projectId/suites`, so the app works in the browser and when Electron loads it as a local file, with no extra setup. All route paths are defined in one file (`src/app/routes.ts`) and every link is built from it, never written as a string, so switching to normal addresses later is a one-line change.

| ID | Screen | Route | Doc |
|---|---|---|---|
| 1.1 | Welcome setup (first launch only) | `/welcome` | screens/01-global.md |
| 1.2 | Projects | `/projects` | screens/01-global.md |
| 1.3 | New project (dialog over Projects) | `/projects/new` | screens/01-global.md |
| 2.3 | Global settings | `/settings` | screens/01-global.md |
| 1.4 | Project overview | `/p/:projectId` | screens/02-project.md |
| 2.2 | Project settings | `/p/:projectId/settings` | screens/02-project.md |
| 2.4 | Environments (platforms × environments, accounts) | `/p/:projectId/environments` | screens/03-knowledge.md |
| 2.1 | Knowledge (documents, skills) | `/p/:projectId/knowledge` | screens/03-knowledge.md |
| 3.1 | Suites (list + test detail) | `/p/:projectId/suites` and `/p/:projectId/suites/:testId?tab=` | screens/04-suites.md |
| 3.2 | New / edit test | `/p/:projectId/tests/new`, `/p/:projectId/tests/:testId/edit` | screens/04-suites.md |
| 3.3 | Import (dialog) | `/p/:projectId/suites/import` | screens/04-suites.md |
| 3.4 | AI explore | `/p/:projectId/explore`, `/p/:projectId/explore/:chatId` | screens/05-ai-explore.md |
| 3.5 | Ready for Suites (modal over AI explore) | modal | screens/05-ai-explore.md |
| 5.1 | Run dialog | modal, opened from many places | screens/06-runs.md |
| 5.2 | Live run | `/p/:projectId/runs/:runId` (state Running) | screens/06-runs.md |
| 5.3 | Paused / interrupted run | same route (state Paused/Interrupted) | screens/06-runs.md |
| 5.4 | Runs list | `/p/:projectId/runs` | screens/06-runs.md |
| 6.1 | Run results + result detail | `/p/:projectId/runs/:runId` (Completed), `?result=:resultId` | screens/07-results.md |
| 6.2 | Visual compare (overlay) | modal | screens/07-results.md |
| 6.3 | Override (dialog) | modal | screens/07-results.md |
| 6.4 | Bug report (dialog) | modal | screens/07-results.md |

**First launch**: if no AI provider is configured → `/welcome`, then `/projects`.
**Startup with an interrupted run**: Overview shows the resume banner (no forced dialog).

## Key cross-links (must work)
| From | Action | To |
|---|---|---|
| Any project screen | Brand / "All projects" | Projects |
| Suites › test | Latest strip "Open result" | Run results with that result selected |
| Suites › test › History | Run number | Run results with that result selected |
| Run results › result | "Open test" / "View test history" | Suites › test (Definition / History tab) |
| Run results › result | "Edit test" | Edit test (shows "Opened from Run #N result" + "Save and re-run") |
| Run results › result | Re-run / Re-run with model | Run dialog prefilled |
| Overview | Resume | Paused/Interrupted run |
| Overview | "Organise in Suites" | Suites, "Not in a suite" expanded |
| AI explore | "Ready for Suites (n)" | 3.5 Ready for Suites modal (cases from all chats) |
| Ready for Suites › case | "Open in chat" | That chat, scrolled to its cases card: `explore/:chatId?message=<index>` |
| Ready for Suites | Move to Suites | Stays in the modal; toast with Undo; the tests are in Suites › "Not in a suite", marked New |
| AI explore chat › moved case | Link "<ID> in Suites" | Suites › that test |
| Suites › test with "Needs fixing" badge | "View in AI explore" | AI explore chat, scrolled to its cases card: `explore/:chatId?message=<index>` (BR-EXPLORE-05) |
| Any test/suite selection | Run | Run dialog → Live run |

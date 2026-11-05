# 03 · Navigation and app shell

## Two shells
### A. Outside a project (Welcome, Projects, Global settings)
- **Welcome** has no shell (centered card).
- **Projects** has a slim app sidebar: QAI brand (top), "Projects" (active), Global settings pinned **bottom-left**.
- **Global settings** page: header with "← Back" (returns to Projects) and title.

### B. Inside a project (every project screen except AI explore)
```
┌──────────────┬───────────────────────────────────────────────┐
│ [Q] QAI      ◂ (round toggle on the sidebar's right edge)      │
│┌────────────┐│ qcfixer.com / Suites                [✦ AI explore] │ ← top bar
││‹ All projects│                                                │
││ qcfixer.com ││                 screen content                  │
│└────────────┘│                                                │
│ Overview     │                                                │
│ Suites       │                                                │
│ Runs         │                                                │
│ Knowledge    │                                                │
│ Project settings                                              │
│ ──────────── │                                                │
│ Global settings                                               │
└──────────────┴───────────────────────────────────────────────┘
```
**Sidebar (full height)**
- Top: QAI brand mark + "QAI". **The brand is a link to All projects** (tooltip "All projects") in both states.
- Project card (expanded only): "‹ All projects" link, project name. Nothing else.
- Nav items with icon + label: Overview, Suites, Runs, Knowledge, Project settings. Active item highlighted.
- Bottom (separated): Global settings. (Theme is NOT here; it is in Global settings.)
- **Collapse/expand**: a small round icon button straddling the sidebar's right edge, vertically aligned with the top bar. Chevron points left (collapse) / right (expand). `aria-label` changes accordingly.
- Collapsed: 64 px icon rail, tooltips on hover/focus, project card hidden, brand mark only (still links to All projects). **No separate back button when collapsed.**
- Collapsed state is remembered across screens and app restarts (localStorage).

**Top bar (above content only)**
- Left: breadcrumb `project name / section / item` (e.g. `qcfixer.com / Runs / Run #12`). Each crumb except the last is a link.
- Right: **AI explore** primary button (sparkle icon). Nothing else (no project switcher, no settings, no theme).

### C. AI explore workspace (focused)
Replaces the whole window: header `← Back to project · AI explore · <project name>`; left = chat list of this project; right = chat. No project sidebar.

## Screens and routes
| ID | Screen | Route | Doc |
|---|---|---|---|
| 1.1 | Welcome setup (first launch only) | `/welcome` | screens/01-global.md |
| 1.2 | Projects | `/projects` | screens/01-global.md |
| 1.3 | New project (dialog over Projects) | `/projects/new` | screens/01-global.md |
| 2.3 | Global settings | `/settings` | screens/01-global.md |
| 1.4 | Project overview | `/p/:projectId` | screens/02-project.md |
| 2.2 | Project settings | `/p/:projectId/settings` | screens/02-project.md |
| 2.1 | Knowledge | `/p/:projectId/knowledge` | screens/03-knowledge.md |
| 3.1 | Suites (list + test detail) | `/p/:projectId/suites` and `/p/:projectId/suites/:testId?tab=` | screens/04-suites.md |
| 3.2 | New / edit test | `/p/:projectId/tests/new`, `/p/:projectId/tests/:testId/edit` | screens/04-suites.md |
| 3.3 | Import (dialog) | `/p/:projectId/suites/import` | screens/04-suites.md |
| 3.4 | AI explore | `/p/:projectId/explore`, `/p/:projectId/explore/:chatId` | screens/05-ai-explore.md |
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
| AI explore | "Add N tests to Suites" | Suites, "Not in a suite" expanded, new tests highlighted |
| Any test/suite selection | Run | Run dialog → Live run |

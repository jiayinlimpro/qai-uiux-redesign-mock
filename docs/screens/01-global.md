# Screens · Global (outside a project)

## 1.1 Welcome setup
**Purpose** First-launch AI provider setup. Shown only when no provider exists.
**Layout** Centered card, max-width 560 px, no shell.
**Content**
- Title "Welcome to QAI", one-line explanation ("Connect an AI provider so QAI can run and create tests. You can change this later in Global settings.").
- AI provider (select). Provider-specific fields: API key (all); Base URL (OpenAI-compatible); Region + Access key ID + Secret access key (AWS Bedrock, no key field).
- Default model (select, list from provider; for AWS Bedrock a text input for model id).
- Collapsible, closed by default: **"Optional: save AI cost with Browser Use + Jev"** → checkbox "Use Browser Use + Jev"; when ticked show, indented: TypeSafe API key (password), TypeSafe model (default `jev-latest`), Text model reasoning (None/Low/Medium/High).
- Primary button "Continue to projects".
**Not included** Test connection button or connection status. [DECIDED]
**States** Validation: Continue disabled until required fields filled.

## 1.2 Projects
**Purpose** Choose, create, import projects.
**Layout** App sidebar (QAI brand top; "Projects" active; Global settings bottom-left) + content max-width 1100 px.
**Content** Title "Projects", subtitle "One project per client system. All data stays on this computer." Buttons: Import project, New project (primary). Table: Project (link) · Apps · Suites · Last run (number + state) · Needs attention (failed / couldn't complete chips, or "All passed") · actions (Open, Export, More: rename, delete).
**States** Empty: illustration-free empty state "No projects yet" + New project + Import project. Delete asks for confirmation (typed project name).

## 1.3 New project (dialog)
**Content** Project name · Apps and environments grid: first column app name; one column per environment with **editable environment names** (defaults Dev, UAT, Prod), each removable; "Add environment"; "Add app"; URL cells may be empty · Default AI model (from Global settings providers). Note: "Environment names and number are up to you (e.g. SIT, Staging, Pre-prod). Accounts, documents and skills are added in Knowledge."
**Actions** Cancel · Create project → 1.4.
**Validation** Name required; environment names unique; at least one environment.

## 2.3 Global settings
**Layout** Header "← Back" (to Projects or previous screen) + "Global settings · Applies to all projects"; sections stacked, max-width 900 px.
**Sections**
1. AI providers: table Provider · Key (masked) · Default model · Edit; "Add provider". Edit opens provider-specific fields (as 1.1). No status/test connection.
2. Cost saving (optional): checkbox "Browser Use + Jev"; fields as 1.1 shown only when ticked. Help: "A cheaper, faster agent for AI runs and failure classification."
3. Appearance: Follow system / Light / Dark. (Only place for theme.)
4. Data on this computer: Back up everything · Restore from backup · Reset settings · Factory reset. Destructive actions confirm and recommend a backup first.
5. Advanced: Developer mode (opens a log window during runs).

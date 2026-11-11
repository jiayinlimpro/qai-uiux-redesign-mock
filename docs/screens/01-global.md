# Screens · Global (outside a project)

## 1.1 Welcome setup
**Purpose** First-launch AI provider setup. Shown only when no provider exists.
**Layout** Centered card, max-width 560 px, no shell.
**Content**
- Title "Welcome to QAI", one-line explanation ("Connect an AI provider so QAI can run and create tests. You can change this later in Global settings.").
- AI provider (select). Provider-specific fields: API key (all); Base URL (OpenAI-compatible); Region + Access key ID + Secret access key (AWS Bedrock, no key field).
- Default model (select, list from provider; for AWS Bedrock a text input for model id). The list is **disabled until the API key is entered** ("Enter the API key to load models"), then loads from the provider (prototype: simulated delay). AWS Bedrock keeps the typed model id.
- Collapsible, closed by default: **"Optional: save AI cost with Browser Use + Jev"** → checkbox "Use Browser Use + Jev"; when ticked show, indented: TypeSafe API key (password), TypeSafe model (default `jev-latest`), Text model reasoning (None/Low/Medium/High). When ticked, the TypeSafe key and model are required.
- Primary button "Continue to projects".
**Not included** Test connection button or connection status. [DECIDED]
**States** Validation: Continue disabled until required fields filled.

## 1.2 Projects
**Purpose** Choose, create, import projects.
**Layout** App sidebar (QAI brand top; "Projects" active; Global settings bottom-left) + content max-width 1100 px.
**Content** Title "Projects", subtitle "One project per client system. All data stays on this computer." Buttons: Import project, New project (primary). Table: Project (link) · Platforms · Suites · Last run (number + state) · Needs attention (failed / couldn't complete chips of the last completed run, or "All passed") · actions (Open, Export, More: rename, delete). Export opens the export dialog with "Include account passwords" (screens/02-project.md § 2.2 Data, D37).
**Rename** Dialog with the project name; a name another project already uses is blocked inline (BR-PROJECT-01, D35).
**Import project** If the project in the file is already on this computer, a dialog **"This project already exists on this computer"** offers: **Replace it** (warning: runs and changes made here since the export are lost) · **Import as a copy** (added as "<name> (copy)", "(copy 2)"… with new IDs) · **Cancel** (BR-PROJECT-02, D34). A different project whose name is taken is imported as "<name> (2)".
**States** Empty: illustration-free empty state "No projects yet" + New project + Import project. Delete asks for confirmation (typed project name).

## 1.3 New project (dialog)
**Content** Project name · Platforms and environments grid: first column platform name; one column per environment with **editable environment names** (defaults Dev, UAT, Prod), each removable; "Add environment"; "Add platform"; URL cells may be empty · Default AI model (from Global settings providers). Note: "Environment names and number are up to you (e.g. SIT, Staging, Pre-prod). Accounts, documents and skills are added in Knowledge."
**Actions** Cancel · Create project → 1.4.
**Validation** Name required and not already used by another project (case-insensitive; shown inline as you type, BR-PROJECT-01); environment names unique; at least one environment.

## 2.3 Global settings
**Layout** Header "← Back" (to Projects or previous screen) + "Global settings · Applies to all projects"; sections stacked, max-width 900 px.
**Saving** (D32) Toggles save at once with a small "Saved" confirmation: theme, developer mode, Browser Use + Jev on/off. Adding/editing a provider and the Browser Use + Jev key fields use explicit **Save / Cancel**. Partial secrets are never saved (e.g. only one of the two AWS access keys).
**Sections**
1. AI providers: table Provider · Key (masked) · Default model · Edit · **Remove**; "Add provider". Edit opens provider-specific fields (as 1.1). No status/test connection.
   **Remove** (D33) asks for confirmation. The last provider cannot be removed (BR-PROVIDER-02). Projects whose default model only the removed provider offers switch to the next provider's default model; the confirmation lists them and the result message tells the user (BR-PROVIDER-03).
2. Cost saving (optional): checkbox "Browser Use + Jev"; fields as 1.1 shown only when ticked. Help: "A cheaper, faster agent for AI runs and failure classification." Unticking saves at once. Ticking saves at once if a TypeSafe key is already saved; otherwise the fields show and the setting is turned on with **Save** once the key is entered. Key, model and reasoning changes use Save / Cancel.
3. Appearance: Follow system / Light / Dark. (Only place for theme.)
4. Data on this computer: Back up everything · Restore from backup · Reset settings · Factory reset. Destructive actions confirm and recommend a backup first.
5. Advanced: Developer mode (opens a log window during runs). When Developer mode is on: **"Load sample data"**, labelled **Prototype only**: replaces all projects with the sample data (AI providers and settings kept), after confirmation. Not part of the real product.

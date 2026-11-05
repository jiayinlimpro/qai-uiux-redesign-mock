# Screens · 2.1 Knowledge

**Purpose** Everything the AI may use for this project.
**Layout** Single scrolling page with anchor chips: Apps and environments · Accounts · Documents · Skills.

## Apps and environments (interactive grid)
- Header row: "App" + one column per environment; environment names are **editable inputs**, each with a remove (×) button; "Add environment" and "Add app" buttons.
- Rows: app name (editable) + URL per environment (editable, may be empty).
- Help: "Name environments the way your company does. The run dialog lists these environments; every app resolves to the chosen environment's URL. Leave a cell empty if an app has no such environment."
- Removing an environment that has accounts or runs asks for confirmation.

## Accounts
Table: Role · App · Environment · Username · Password (masked, reveal on click) · Edit. "Add account". Help: "Tests can say 'log in to Admin portal as Admin'; the AI finds the matching URL and account for the run's environment."

## Documents
Table: Name · Type (FRS, User stories, Other) · Applies to (Project-wide / Suite: X / Test: Y) · Uploaded · actions Replace · Edit scope · Delete. "Upload".

## Skills
Table: Name · Kind (Instructions / Codebase / Reference) · Applies to · Used by (Runs, AI explore) · Edit scope. "Load skill". Folder loads skip dependency/build folders and secret files (legacy rule kept).

**States** Empty per section with one-line explanation + add button.

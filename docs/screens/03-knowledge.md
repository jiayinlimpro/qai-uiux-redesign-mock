# Screens · 2.1 Knowledge

**Purpose** Everything the AI may use for this project.
**Layout** Single scrolling page with anchor chips: Apps and environments · Accounts · Documents · Skills.

## Apps and environments (interactive grid)
- Header row: "App" + one column per environment; environment names are **editable inputs**, each with a remove (×) button; "Add environment" and "Add app" buttons.
- Rows: app name (editable) + URL per environment (editable, may be empty). Each app row has a remove (×) button.
- Help: "Name environments the way your company does. The run dialog lists these environments; every app resolves to the chosen environment's URL. Leave a cell empty if an app has no such environment."
- Edits are a draft saved with **Save / Cancel** ("Unsaved changes" shown meanwhile). Validation as in New project (unique environment names, at least one environment, an app with a URL needs a name).
- Removing an environment that has accounts or runs asks for confirmation ("2 accounts for SIT will be deleted when you save · 13 runs used SIT. They keep their results and still show SIT."). Removing an app that has accounts asks too. On Save the removed environment's/app's accounts are deleted; runs keep their environment snapshot (BR-ENV-04, D36).

## Accounts
Table: Role · App · Environment · Username · Password (masked, reveal on click) · Edit. "Add account". Help: "Tests can say 'log in to Admin portal as Admin'; the AI finds the matching URL and account for the run's environment."
- **Reveal**: "Show password" fetches the password on that click only; the account list never contains it (D40). "Hide" masks it again.
- Add / Edit dialog: Role · App · Environment · Username · Password (write-only; empty keeps the saved one). Role + app + environment must be unique (BR-ENV-03), shown inline. **Delete account** is in the Edit dialog, with confirmation (D40).

## Documents
Table: Name · Type (FRS, User stories, Other) · Applies to (Project-wide / Suite: X / Test: Y) · Uploaded · actions Replace · Edit scope · Delete. "Upload".
- **Upload** (D39): accepted files .pdf .docx .md .txt .xlsx .csv .json .png .jpg; limits 20 MB for pdf/docx/xlsx, 2 MB for text files (md, txt, csv, json). Anything else is refused with the reason. The dialog asks Name · **Type (required, no default)** · Applies to. Reason: an FRS is treated as authoritative (BR-REASON-05).
- **Replace** applies the same file rules and keeps type and scope. **Delete** asks for confirmation and unlinks the document from tests.

## Skills
Table: Name · Kind (Instructions / Codebase / Reference) · Applies to · Used by (Runs, AI explore) · Edit scope · Delete. "Load skill".
- **Load skill**: choose a file or a folder. Kind follows what was loaded (legacy rule): a .md/.txt/.pdf/.docx file → Instructions; a folder → Codebase; any other single file → Reference. New skills are used by both Runs and AI explore (changeable).
- Folder loads skip dependency/build folders (node_modules, .git, dist, build, out, .next, coverage, vendor, __pycache__, venv/.venv, target, bin, obj), binaries and logs, and files that may contain secrets (.env*, *.pem, *.key, *.p12, *.pfx, *.keystore, id_rsa, id_ed25519) (legacy rule kept). The dialog shows "N files to load · M files skipped" and an expandable **list of what was skipped** with the reason (a skipped folder once, other files by path). Limit after skipping: 5000 files / 100 MB.
- **Edit scope** also changes Used by. **Delete** asks for confirmation (D40).

**States** Empty per section with one-line explanation + add button.

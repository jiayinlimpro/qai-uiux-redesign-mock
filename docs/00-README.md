# QAI prototype — documentation index

Source of truth for the QAI redesign prototype. Written for three readers:
1. **Claude Code** (builds the prototype) — follow `CLAUDE.md`.
2. **Developers** (will build the real product on it) — read 01, 05, 07, 10, 12, 13.
3. **Product / QA reviewers** — read 01, 03, 04, screens/.

## Files
| # | File | Contents |
|---|---|---|
| 01 | `01-overview.md` | Purpose, users, principles, scope |
| 02 | `02-glossary.md` | Every product term, one definition |
| 03 | `03-navigation.md` | App shell, sidebar, top bar, screen list and routes |
| 04 | `04-user-flows.md` | Journeys, failure loop, secondary flows |
| 05 | `05-business-rules.md` | Numbered rules (BR-…) the UI must follow |
| 06 | `screens/*.md` | One file per area: purpose, layout, content, actions, states |
| 07 | `07-data-model.md` | Entities, fields, enums, data layer API, sample data |
| 08 | `08-design-system.md` | Interim visual tokens and components |
| 09 | `09-parked.md` | Ideas NOT to build now |
| 10 | `10-open-questions.md` | Questions for the engine developers |
| 11 | `11-build-plan.md` | Build slices, order, acceptance checks, prompts |
| 12 | `12-decision-log.md` | Decisions, reasons, rejected alternatives |
| 13 | `13-legacy-mapping.md` | Every old QAI feature → where it lives now |
| 14 | `14-handover.md` | For engineering: real vs mocked, replacing the data layer, api status, limits, dev switches |
| 15 | `15-decisions-since-plan.md` | Decisions D24–D71 that changed or added scope since the original plan |
| — | `reference/prototype-screens/` | Screenshots of the built prototype, every screen and dialog (default state) |
| — | `reference/legacy-user-manual-v2.0.pdf` | Old app manual (context only) |
| — | `fixtures/qcfixer-tests-seed.csv` | Real test set (83 tests) to seed sample data |

## Status markers used in the docs
- **[DECIDED]** agreed, build it.
- **[PROPOSAL]** built in the prototype but clearly labelled; may be dropped after review.
- **[DEV-CONFIRM]** UI is built, but real behaviour depends on an engine answer (see 10).
- **[PARKED]** do not build (see 09).

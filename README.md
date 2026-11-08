# Le Petit Burnham

The Burnham household's dinner and grocery system. Ryan and Diana see a bistro chalkboard menu for the week, swap or edit dishes, wish for dishes, approve the week, and keep a running pantry. A daily Cowork scheduled task on Ryan's Mac drafts menus and keeps the shared **Groceries** list in Apple Reminders and the **Family** calendar in step.

- **Live page:** https://claude.ai/artifact/4NPHBVY8jexT97z2BBPFPX (private; share it with Diana as an Editor)
- **Agent prompt:** [AGENT_PROMPT.md](AGENT_PROMPT.md)
- **How it fits together and setup:** [WIRING.md](WIRING.md)
- **Vault record:** `Projects/le-petit-burnham/README.md` in the Baalda vault

## Repo layout

| Path | What |
|---|---|
| `app/le-petit-burnham.html` | The published page (built from `body.html` + `app.js` and the mockup's styles) |
| `app/body.html`, `app/app.js` | Page markup and script, kept separate for editing |
| `seed/` | The first database load: the week of 8 November 2026 from the Saturday dinner run, the 25 October history line, likely-on-hand pantry items. `_batch.json` is the ArtifactData batch that wrote them |
| `mockup/` | The static mockup Diana was shown first |

## Data model

Collections in the artifact database: `weeks`, `groceries`, `wishes`, `pantry`, `receipts`, `history`, `meta/sync`. Field-level detail is in [AGENT_PROMPT.md](AGENT_PROMPT.md#the-database-read-and-write-with-the-artifactdata-tool-on-artifact_url).

## Decisions (interview, 7 November 2026)

1. Runs as Claude Code on Ryan's Mac, daily, with the artifact as the shared window.
2. Pantry updates from checked-off reminders, cooked dinners, quick taps, and receipt photos.
3. Either Ryan or Diana can approve. Swaps happen on the page (Claude suggests three). Calendar events stay.
4. Look: corner bistro chalkboard. No kid ratings.
5. Flat **Groceries** list; Reminders sorts it into sections. The agent never duplicates or deletes what people typed.
6. Fresh start, no external doc. The vault's Saturday dinner run supplied the first week and history.
7. Kids get mild food, heat on the side. Wishes are guaranteed a night within two weeks.
8. Dinners go on the **Family** calendar (Apple), 6 to 7 pm.
9. Everything on the page is editable and removable.

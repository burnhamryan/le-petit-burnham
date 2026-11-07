# Vault changes waiting to be applied

Baalda refused writes from the 7 November 2026 session partway through ("key_required": the connection did not have the vault's key yet). `Projects/le-petit-burnham/README.md` landed. These did not. Apply them in a session where Baalda writes work, then delete this folder.

## New notes

| Create at | From |
|---|---|
| `Projects/le-petit-burnham/specs/brief.md` (folder `specs` already exists) | `brief.md` here |
| `Resources/operator/kitchen-manager.md` | `kitchen-manager.md` here |

## Edits to existing notes

1. **`Projects/CLAUDE.md`**, in the `## What is here` table, after the ai-radar row:
   `| [[Projects/le-petit-burnham/README]] | The household dinner and grocery system: a shared bistro chalkboard page for Ryan and Diana and a daily kitchen manager run that feeds Reminders and the Family calendar |`

2. **`Resources/operator/automations.md`**, under `## Not yet built`, add:
   `- **Kitchen manager**, the daily run behind [[Projects/le-petit-burnham/README]]: drafts the week on Fridays, reads receipts and checked-off reminders into the pantry, and after Ryan or Diana signs, pushes groceries to the Groceries list and dinners to the Family calendar. Rules in [[Resources/operator/kitchen-manager]]. Runs on the Mac, because Reminders has no cloud API. Replaces the Saturday dinner plan once it has worked for a week.`

3. **`Resources/operator/dinner-plan.md`**, insert after the first paragraph (the one ending "Listed in [[Resources/operator/automations]]."):
   `**Being replaced (7 November 2026)** by [[Projects/le-petit-burnham/README]], a shared chalkboard page Diana can edit and approve, with a daily run that writes Reminders and the Family calendar. This week's draft below is already on that page. Keep this run until the new one has worked for a week.`

4. **`Daily/2026-11-07.md`**, append at the end:

```
## Session: Le Petit Burnham

Built the household dinner and grocery system with Ryan, after a 7-question interview. The live chalkboard page is up with this week's dinners from the Saturday run, and the full record is in [[Projects/le-petit-burnham/README]].

- Decisions: runs daily on the Mac, either Ryan or Diana approves, swaps on the page, Family calendar, flat Groceries list, mild food with heat on the side, wishes guaranteed within two weeks. Full list in [[Projects/le-petit-burnham/specs/brief]].
- Live page seeded: week of 8 November, the 25 October history line, 9 likely-on-hand pantry items.
- Rules for the daily run in [[Resources/operator/kitchen-manager]], not scheduled yet.
- Not done: Diana not shared on the page yet, GitHub push blocked (invalid token in the session), and Baalda refused writes partway through, so some of these notes were applied later.
```

5. **`Context/people/Diana.md`**, append:
   `Has her own Claude account (Ryan, 7 November 2026), so she can be an Editor on shared artifacts such as the chalkboard menu in [[Projects/le-petit-burnham/README]].`

6. **`Projects/le-petit-burnham/README.md`** (already in the vault): the repo is now on GitHub at `github.com/burnhamryan/le-petit-burnham` (private), pushed 7 November 2026.
   - In the bottom line, drop "and the code is committed locally but not on GitHub".
   - In the `## What exists` table, set the Code repo row to: `| Code repo | github.com/burnhamryan/le-petit-burnham, private | Pushed 7 November, 2 commits |`
   - In `## Next steps`, tick the GitHub line: `- [x] Create the private GitHub repo and push (7 November)`
   - Drop the closing paragraph about the code living only in the artifact.

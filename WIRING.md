# How Le Petit Burnham fits together

```
 Ryan's phone ─┐
               ├─► Shared artifact (menu + database)
 Diana's phone ┘            ▲
                            │ reads and writes
           Cowork scheduled task on Ryan's MacBook Pro, daily
                 │                       │
                 ▼                       ▼
     Reminders "Groceries"       Calendar "Family"
     (via mcp/apple-reminders)
```

One daily Cowork task does everything. Cowork on the Mac has the three things the job needs: the artifact database tool, Reminders (through the `reminders` MCP server in `mcp/apple-reminders`) and Calendar. Plain Claude Code in Terminal does not have the database tool, which is why the first launchd attempt on 8 November 2026 failed.

## Who does what
| Piece | Does | Never does |
|---|---|---|
| Artifact (both phones) | Shows the menu, swaps dishes on the spot, records wishes, approvals, 86'd nights, quick-adds, pantry taps, receipt photos | Touch Reminders or Calendar |
| Cowork task (daily) | Reads receipts and checked-off reminders, updates the pantry, drafts on Friday, pushes approved groceries and specials to Reminders, makes calendar events | Message anyone, touch reminders or events it did not create |

## The weekly rhythm
- **Friday morning:** new chalkboard goes up, "awaiting approval".
- **Friday to Sunday:** either of you swaps, wishes, approves.
- **Next morning run after approval:** groceries land in Reminders, dinners on the Family calendar.
- **Weekend:** shop together off Reminders, check things off, snap the receipts into the page.
- **Every day:** the run reconciles what got bought and cooked.

## Setup
- [x] Live artifact with `db`, `user`, `sample`, `assets`, seeded with the week of 8 November.
- [x] Diana has access.
- [x] Reminders MCP server installed in the Claude desktop app (patched copy in `mcp/apple-reminders`).
- [ ] Cowork scheduled task, daily, with the prompt from `AGENT_PROMPT.md`.
- [ ] After one good week, retire the old Saturday dinner run (vault `Resources/operator/dinner-plan`).

## Things to watch in week one
- Whether new items land in the right Groceries sections on the phones.
- Pantry drift. If it says you have something you don't, tap "Out" once.
- The Mac has to be awake for the run. Cowork runs a missed task when the Mac wakes, per its own settings.

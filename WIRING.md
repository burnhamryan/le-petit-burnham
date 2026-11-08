# How Le Petit Burnham fits together

```
 Ryan's phone ─┐                        6:43  cloud kitchen manager (Claude, scheduled)
               ├─► Shared artifact ◄──────►  reads/writes the database, drafts, pantry
 Diana's phone ┘   (menu + database)            │ writes bridge/outbox.json (GitHub)
                                                ▼
                                       7:07  Mac script (launchd, no AI)
                                             applies outbox to Reminders "Groceries"
                                             and Calendar "Family", writes
                                             bridge/inbox.json (what got checked off)
```

Why two halves: the artifact database tool exists only in cloud Claude sessions, and Reminders and Calendar exist only on the Mac. Found on 8 November 2026 when the all-in-one Mac run could not reach the database.

## Who does what
| Piece | Does | Never does |
|---|---|---|
| Artifact (both phones) | Shows the menu, swaps dishes on the spot, records wishes, approvals, 86'd nights, quick-adds, pantry taps, receipt photos | Touch Reminders or Calendar |
| Mac agent (daily) | Reads receipts and checked-off reminders, updates pantry, drafts Friday, pushes approved groceries and snacks to Reminders, makes calendar events | Message anyone, delete what you typed into Reminders |

## The weekly rhythm
- **Friday morning:** new chalkboard goes up, "awaiting approval".
- **Friday to Sunday:** either of you swaps, wishes, approves. Approval stamps the menu.
- **Next daily run after approval:** groceries land in Reminders, dinners land on Family calendar.
- **Weekend:** shop together off Reminders, check things off. Snap the Costco and Walmart receipts into the artifact.
- **Every day:** the agent reconciles what got bought and cooked.

## Setup checklist
- [x] **Live artifact built** with `db`, `user`, `sample` and `assets`, seeded with the week of 8 November from the vault's Saturday dinner run (7 November 2026).
- [ ] **Share it with Diana as an Editor** from the page's Share menu, so her taps, swaps and signature save.
- [ ] **Claude Code on the Mac**, signed in to the same claude.ai account that owns the artifact, so it can use the ArtifactData tool.
- [ ] **macOS permissions:** the first `osascript` run asks to let the terminal control Reminders and Calendar. Allow both (System Settings, Privacy and Security, Automation).
- [ ] **Schedule the daily run:** `zsh scripts/install-daily.sh` on the Mac installs a launchd job (7:07 daily, logs in `~/Library/Logs/le-petit-burnham.log`). It checks Reminders and Calendar access first.
- [ ] **Retire the old Saturday dinner run** (08:23 Saturdays, rules in the vault's `Resources/operator/dinner-plan`) once the daily run has worked for a week, so two runs are not drafting menus.
- [ ] **Seed the pantry for real:** one Costco receipt photo plus a few taps.

## Things to watch in week one
- Whether items added by AppleScript get auto-sorted into the grocery sections on your phones. If they land in "Other", tell the agent and we will add a section hint to the item name.
- Pantry drift. If it says you have something you don't, tap "Out" once and it learns.

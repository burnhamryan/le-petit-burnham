# How Le Petit Burnham fits together

```
 Ryan's phone ─┐                         ┌─► Apple Reminders  "Groceries" (shared)
               ├─► Shared artifact  ◄────┤
 Diana's phone ┘   (menu + market,       └─► Apple Calendar   "Family"
                    shared database)  ▲
                                      │ reads and writes daily
                         Claude Code on Ryan's Mac (scheduled)
```

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
- [ ] **Schedule the daily run** (for example 7:00 am) with the prompt in `AGENT_PROMPT.md`: Claude Code's scheduled tasks in the desktop app, or launchd running `claude -p` with `osascript` allowed.
- [ ] **Retire the old Saturday dinner run** (08:23 Saturdays, rules in the vault's `Resources/operator/dinner-plan`) once the daily run has worked for a week, so two runs are not drafting menus.
- [ ] **Seed the pantry for real:** one Costco receipt photo plus a few taps.

## Things to watch in week one
- Whether items added by AppleScript get auto-sorted into the grocery sections on your phones. If they land in "Other", tell the agent and we will add a section hint to the item name.
- Pantry drift. If it says you have something you don't, tap "Out" once and it learns.

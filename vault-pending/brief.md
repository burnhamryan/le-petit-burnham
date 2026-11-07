---
type: spec
status: active
date: 2026-11-07
project: le-petit-burnham
tags: [meals, groceries, spec, decisions]
---

**Bottom line:** a shared bistro chalkboard page for the week's dinners and groceries, run by a daily kitchen manager on Ryan's Mac that writes to Reminders and the Family calendar only after Ryan or Diana signs. These are the decisions from the 7 November 2026 interview, the record of why [[Projects/le-petit-burnham/README]] works the way it does.

## The job

Plan Sunday to Friday dinners, keep a pantry of what is in the house, and keep the shared **Groceries** list stocked, with Ryan and [[Context/people/Diana]] reviewing and changing everything on one page that looks like a restaurant menu. It grew out of the Saturday draft in [[Resources/operator/dinner-plan]], which only Ryan could approve and only by chat.

## Decisions

| # | Question | Answer |
|---|---|---|
| 1 | Where does it run | Claude Code on Ryan's Mac, scheduled daily. The artifact is the shared window. Reminders has no cloud API, so the Mac does the writing |
| 2 | How the pantry stays accurate | Checked-off reminders, cooked dinners, quick taps on the page, and receipt photos |
| 3 | Approval | Either Ryan or Diana signs. Swaps happen on the page, with Claude suggesting three. Calendar events stay |
| 4 | Look | Corner bistro chalkboard. No kid ratings |
| 5 | Grocery list shape | One flat list, the existing shared **Groceries** list. It is an Apple grocery list, so it sorts itself into sections. The agent never duplicates or deletes what people typed |
| 6 | Source of truth | Fresh start in the artifact database. First week and history came from the dinner-plan note |
| 7 | Hard limits | Kids get mild food, heat on the side. A wished-for dish is guaranteed a night within two weeks |
| 8 | Calendar | The **Family** calendar in Apple Calendar, 6 to 7 pm. It has a public webcal link, so dinner titles are visible to anyone holding that link |
| 9 | Editing | Every dish, wish, grocery item, special and pantry item can be edited or removed on the page, and those edits always beat the agent |

Calls made without asking, which Ryan can overturn: the menu is drafted Friday morning so the weekend is for shopping; a wish that needs more than 20 minutes goes on Sunday; nothing reaches Reminders or the calendar for dinners if nobody signs.

## Guardrails

- No messages to anyone. The run's 3-line reply is the only report.
- The agent edits or deletes only the reminders and calendar events it created, tracked by stored ids.
- No em dashes in anything it writes.

## Done means

- [x] Mockup signed off in shape, then rebuilt live with shared storage, on-page swaps and receipt uploads (7 November)
- [x] Live page seeded with the week of 8 November
- [ ] Diana has Editor access
- [ ] The daily run is scheduled and has pushed one approved week to Reminders and the calendar

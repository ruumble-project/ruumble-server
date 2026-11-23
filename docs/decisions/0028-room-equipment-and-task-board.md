# ADR-0028: Room equipment and the task board

Status: proposed (2026-11-23)

## Context
Sometimes a person in a room needs help. They call out, but not everyone has time right away, or nobody is (still) there. A room needs a place where everyone can see who needs help, whether someone is already helping and what is done (#29). At the same time rooms should get equipment of their own: the board is always there, the binders show the Mumble description, and new items like this task board come and go per room.

## Decision
| Topic | Decision |
|---|---|
| **Equipment** | Kept by the service per channel in `equipment.json` (`EquipmentBook`, `bridge/src/equipment.ts`), only for channels that differ from `EQUIPMENT_DEFAULTS` (binders on, task board off). Not in the Mumble description: that would need Ruumble Client to write it, take room in a limited field and be visible in plain Mumble. Every snapshot carries `equipment`; changing it (`PUT /api/equipment/:channelId`) needs Mumble's Write permission on the room or floor. Rooms (2nd level) and floors (their corridor) can be equipped. |
| **Where it is set** | A second tab "Equipment" in "Set up room" / "Set up floor" (Ruumble Client, where that dialog lives): one section per item with a picture, a short explanation and a switch; settings appear below a switched-on item. The board has no switch. |
| **Task board** | Requests in `taskboard.json` (`TaskBook`, `bridge/src/taskboard/`), REST under `/api/taskboard`. Asking only from inside the room (`not-in-room` otherwise); seeing, +1 and taking on for everyone who may enter (Mumble's Enter permission, as for moving); one helper per request. Asker and helper put a request back or mark it done; the asker marks it solved; everyone involved (asker, helper, +1) reopens it; the asker may thank the helper with a card (8 drawn motifs, own text). The rules are one pure function in protocol (`applyTaskAction`), so the service, the mock and the web UI's buttons agree. People are named by the snapshot's `person` id, so a request stays theirs after they leave. |
| **What everyone sees** | Per viewer, the snapshot carries `taskboards`: for each channel with a task board the viewer may enter, the open count, the oldest and the newest open request, who asks and who helps (`summarizeTasks`). The floor plan draws the board in the door strip with orange cards and a flag while something waits: red while the newest request is less than 2 hours old (`TASK_NEW_MS`), then green, waving after `waveMinutes`. A number on the board was dropped: too small to read, the cards show it, and marks people at their avatar: asking (orange hand) or helping (blue). |
| **Notices** | Every change goes as `taskboard` on `/ws/ui` to everyone who may enter the channel, the person who did it included: a plaque fades in on the room's outer wall and the wall lights up in the event's colour; several queue behind it. The people in the room get a line in their Mumble log, and the people involved who are elsewhere (the target of an `@` request, the asker, the helper, +1) one of their own. There is no setting for this. Entering a room with open requests shows a plaque for that person only, at most once an hour per room. |
| **Housekeeping** | Done requests are removed after the channel's `clearDays`; at most 50 unfinished requests per board. An asker whose helper left more than an hour ago is asked once in their Mumble log whether it is done. Room care shows the number of requests and clears them (`DELETE /api/taskboard/:channelId`, Write). |
| **Colour** | A new reserved token `--color-signal` (and its ink and tints): only the task board, its flag and cards, the marks at the avatars and the plaques. Yellow stays with the board, red with deleting. |

## Rejected options
- **Equipment in the Mumble description** (a hidden marker). Needs Ruumble Client to write, shows up in plain Mumble and competes with the text people write there.
- **The board's task lists (A2) as the task board.** They are shared checklists inside one post; a request needs a person, a helper, states and notices to the whole floor.
- **Passing a request on to the floor** when nobody is in the room. Dropped in the concept: the flag is visible on the floor anyway.
- **Several helpers, points or a ranking.** One helper keeps it clear who is on it; thanks instead of points, so helping does not become a contest.
- **SQLite next to the board.** The requests are few and short-lived; a JSON file like the statuses is enough and needs no migration.

## Consequences
- The protocol grows by `Equipment`, `TaskRequest`, `TaskBoardSummary`, `TaskEvent`, the optional snapshot fields `equipment` and `taskboards`, `RoomCare.tasks` and the event `taskboard`. Older web UIs ignore them. The plugin is unchanged: `notify` exists.
- The door strip got one baseline: door plate, task board and binders end 8 px from the wall, at the bottom of the people count. The board's notes now hang on a cork board on the wall, centred on the task board's board, so the two pieces of furniture belong together without looking alike.
- Requests name people and what they need help with; they are kept until done and cleared, so the data directory now also holds `equipment.json` and `taskboard.json` (back them up with the rest).

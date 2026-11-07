# ADR-0027: Listening in on another room of the own floor

Status: proposed (2026-11-07, decisions by Bert in #19)

## Context
Mumble lets a user listen to other channels while staying in their own (channel listening, Mumble 1.4 and newer).
Ruumble showed only that someone listens (the ear on the room, E27); the user could not listen themselves. Mumble's
rules are wider than the building metaphor: any channel, on any floor, persisted by the server for registered users
and restored on connect, kept when the user moves, and allowed by its own `Listen` permission regardless of `Enter`.

## Decision
| Topic | Decision |
|---|---|
| **Where** | Only rooms on the floor the user is in. Not the corridor or an open floor, never the own room, never a closed room (no Enter permission, stricter than Mumble), never without Mumble's `Listen` permission. Other floors are out of sight; the metaphor and the display do not carry them. |
| **Operation** | The room's door is a button inside Ruumble Client: a click opens it a little further (from 33° to 45°, listen in), a second click closes it again. The room then gets a soft glow spreading from the door. A double click on the room still enters it. Hover only: the room strengthens the door's swing line, the door swings to 45° and shows a faint ear; on an open door the ear grows and glows instead. No permanent new symbol, no one-time hint. |
| **Ending** | Ruumble Client ends any listening that breaks the rules, wherever it came from: a floor change (also to the entrance), entering the room, a room becoming closed, and listening Mumble restored on connect or started from its own menu. Only looking at another floor through the elevator ends nothing. |
| **Volume** | Per room, -30 to +12 dB, through a small tag beside the open door and in the list at the top bar. Start value -15 dB (audible, very discreet); Mumble keeps the value per room afterwards. |
| **Attenuation** | Mumble's listener attenuation ("quieter when someone talks in my room") is switched on once by Ruumble Client with a strong factor (0.25), the first time a page listens in; the user can switch it off in the list. |
| **Top bar** | While listening, a tab with an ear and the count hangs at the room sign; it lists the rooms with volume and stop, the attenuation switch and "Stop all". |
| **Interfaces** | The service stays read-only (ADR-0002): it reads the `Listen` permission (0x800) via Ice and sends `canListen` in the snapshot (optional, older web UIs ignore it). Switching goes through the `desk` object of Ruumble Client (`startListening`, `stopListening`, `setListeningVolume`, `setListenQuieter`, `listening`, `listeningRefused`); Mumble is not changed. The rules live in the web UI (`web/src/lib/model/listening.ts`). |
| **Without Ruumble Client** | The browser and older clients show the state (an open door where the own user listens, from Ice) but cannot switch it. |

Current state (#24, #25): Mumble server 1.5 shows the listeners only to Ice's write secret. There the service reports `listenersHidden` and shows instead what the web UIs inside Ruumble Client report of their own listening (`listening` on `/ws/ui`); listening with plain Mumble stays invisible, and the user menu says so. Mumble server 1.6 shows all listeners to the read secret.

Current state (#22): entering the room one listens to only pauses listening. It ends in Mumble as before (no guest, no ear while inside), and Ruumble Client starts it again once the user leaves the room for another place on the same floor. A floor change, "Stop all" or a room that can no longer be listened to forget the pause.

Current state (#21): the listeners are no longer anonymous. Everyone sees them as guests in the room they listen to (by name, after the people present, not counted), the door of a room someone listens to stands open for everyone, and a listener's own avatar carries an ear. Mumble lists them by name anyway, and the people in a room should know who hears them.

## Rejected options
- **Listening on any floor.** Mumble allows it, but the floor plan shows one floor; a sound from a room one cannot see breaks the metaphor.
- **The corridor through the own door.** Nice image, but a click on the own door would mean something else than on every other door.
- **A muffled "through the door" sound.** Mumble has no such filter; it would need a patch of Mumble's audio mixing.
- **Switching through Ice.** Ice has `startListening`, but the service must stay read-only (ADR-0002).

## Consequences
- Charter 3.4 gets the rule for the own listening next to E27.
- Mumble reports a refusal only as a log line: Ruumble Client matches it against Mumble's texts. "You were denied Listen privileges in <channel>" names the channel; the two listener limits name none and belong to the last request (open for 5 s). Other refusals (entering a closed room) are not taken for a request.
- A room Mumble reports at exactly 0 dB right after a click gets the start value -15 dB, also when the user had set it to 0 dB on an earlier visit (Mumble cannot tell "never set" from 0 dB).

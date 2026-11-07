# Changelog

All notable changes to Ruumble. The service and the web UI share one version; the plugin has its own, noted where it changed. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow [Semantic Versioning](https://semver.org/).

0.14.0 is the first published release. Earlier versions were only run by the author and are listed for reference. 0.16.0–0.18.0 and 0.20.0–0.24.0 were not published either; their changes are in 0.19.0 and 0.25.0.

## [Unreleased]

### Changed

- **Versions in the user menu:** the foot of the user menu shows the Ruumble server's exact version (from the service, e.g. `0.40.0-4-ge98c24a`) and, inside Ruumble Client, the client's version; the Mumble server's version is gone (#24)
- **Plant and paint bucket in full colour where they work:** a plant one may tend and the paint bucket are drawn in full colour; only a plant that is mere decoration (no Mumble Write) stays pale, also at the entrance of the building overview. Before, every plant and the bucket were pale until hovered (#20)
- **Listening in resumes after a visit (Ruumble Client):** entering a room one listens to still ends listening, but only while inside: leaving it for another room or the corridor of the same floor listens in again, at the volume Mumble kept. Nothing shows the pause, neither for the user nor for the others. A floor change, "Stop all" or a room that can no longer be listened to forget it (#22)

### Added

- **Hint when listeners are hidden:** Mumble server 1.5 shows who is listening in only to Ice's write secret, so Ruumble saw no listeners there and showed nobody (`getListeningUsers` failed silently). The service now notices the `InvalidSecretException`, logs it once and sends `listenersHidden: true` in the snapshot (optional field); the user menu then says "Listening in is not shown" with the reason, and the list of rooms one listens to tells the user that the others do not see it. Mumble server 1.6 shows the listeners (#24)
- **Who is listening in, for everyone:** a person listening in on a room stands in it as a guest after the people present: their avatar with a dashed ring on a pale ground, an ear and the name in italics, not counted in the occupancy and no drop target; hovering shows their person card. The door of a room someone listens to stands open (45°) for everyone, without the own ear and glow. A listener's own avatar carries an ear with the rooms in its tooltip, and the ear at the door plate names the listeners instead of counting them. Data from Ice as before, no protocol change (#21)
- **Paint bucket for the room setup (Ruumble Client):** whoever may set a room up (Mumble Write) finds a paint bucket with a brush beside the plant; a click opens the room setup, like the "Room setup" tile in the room menu. Inside Ruumble Client every door of the floor moves 36 px to the right to make room for it, also in rooms without the bucket, so the doors stay in line; browsers keep the old layout. The room plant is a little larger (30 px instead of 22) (#20)
- **Room menu:** "Room setup" / "Floor setup" is now a tile with the paint bucket as its icon instead of a line with a pencil below the tiles; the tiles follow the room from the door: setup, care, board. Without Mumble Write the setup and care tiles stay, disabled, with a tooltip saying why (they were hidden before). German labels "Raum pflegen" / "Etage pflegen" instead of "Raumpflege" / "Etagenpflege", matching "Raum einrichten" (#20)

## [0.40.0] - 2026-11-07

Plugin 0.5.0 (unchanged). Inside Ruumble Client you can listen in on another room of your floor through its door, with a volume per room, and choose how you transmit (push to talk with the microphone as the talk key). Room descriptions are always Markdown now. Nothing to do when updating; listening in and the transmit menu need the matching Ruumble Client.

### Changed

- **Room descriptions are always Markdown:** Ruumble no longer writes the marker line `<!-- ruumble:markdown -->` and no longer renders Mumble's rich text. A description written in Mumble's own dialog is read as text with its line breaks and lists, its links and bold or italic text kept as Markdown; images and styles go. Fixes descriptions on servers with `allowhtml=false`, which strip the marker (and the room setup then said "not taken over")

### Added

- **Listening in (Ruumble Client):** a click on the door of another room on the own floor listens in without entering; the door, now ajar at 33°, opens to 45° with an ear in it and the room gets a soft glow from the door; a second click closes it. A tag beside the open door sets the volume (start -15 dB, -30 to +12 dB); a tab at the room sign lists the rooms with their volume, "Quieter when someone talks in my room" (Mumble's listener attenuation, on by default) and "Stop all". Only rooms of the own floor, never the own room or a closed one; changing the floor or entering the room ends it, also for listening Mumble restored or started from its own menu. Hovering a room strengthens the door's swing line, hovering the door swings it a little further. The service reads Mumble's Listen permission and sends `canListen` in the snapshot. Needs the `desk` calls of the next Ruumble Client (`startListening` and friends); browsers and older clients show the state only (ADR-0027, #19)

- **How you transmit (Ruumble Client):** a tab next to the microphone opens a menu with Mumble's transmit modes (voice activation, push to talk, always on), the talk key, mute, Mumble's double press and transmit sound, and the mic level; choosing push to talk unmutes. In push to talk the microphone is the talk button: hold to talk, double-click to keep it open; while transmitting it fills sky blue and the line under the top bar lights up. Choosing push to talk without a key opens "Set your talk key" (Right Ctrl suggested; captured through Mumble's shortcut engine, or by the page on Wayland). Where the key works only in the window (Wayland), the page listens for it itself. Uses the new `desk` calls of Ruumble Client (`transmitMode` and friends, ruumble-client#9); older clients keep the plain mute button (`web/src/lib/desk/transmit*.ts`, `web/src/lib/ui/desk/TransmitMenu.svelte`, `KeyDialog.svelte`)

### Fixed

- **Corridor description in Ruumble Client:** opening the binders in the corridor broke the floor plan in Chromium 102 (the popover polyfill placed it inside the corridor's transformed box); the popup now lives straight under the page's body
- **Directory board in Ruumble Client:** it was cut off on the right and the room names were shortened, because the client's fallback CSS for older services widened every `.board`; the board has a class of its own now and its lines take the full width

## [0.39.0] - 2026-11-06

### Added

- **A newer Ruumble Client:** inside an older Ruumble Client a red dot on the name badge and an entry at the top of the user menu point to the new client release. The service asks GitHub every 6 hours for the latest release and passes it on in `/api/version` (`client`); the web UI may only talk to its own service (ADR-0011). Operators switch it off with `CLIENT_RELEASE_CHECK=off`. Needs Ruumble Client 0.39.0 or newer (`desk.clientVersion`) (#18)

## [0.38.0] - 2026-11-06

### Added

- **The rooms of a floor in the floor care:** the list shows the visitors of each room; inside Ruumble Client, with Mumble's permissions, rooms are added, renamed, moved forward or back (arrows, Alt+arrow) and deleted. Deleting offers "Do not delete", "Remove the room" (its board stays under "Gone") and "Delete with all data", with "Save the board as ZIP first". Moving a board is one line ("Transfer data"). Needs Ruumble Client 0.38 or newer (ruumble-client#12)
- **What's new:** "What's new" in the user menu opens the public page of the running version on GitHub (`docs/whats-new/`), written for users with pictures; a development build opens the overview of all versions. `tools/release.sh` turns `docs/whats-new/next.md` into the version's page; `web/scripts/whats-new-shots.mjs` takes its screenshots (#17)
- **The room menu:** the room sign ("You are here") opens a menu for the place one is in: the board (B) and the room care as tiles (like the quick switches of the user menu, the same width), and, with Mumble Write inside Ruumble Client, "Room setup …". On the corridor and an open floor the same menu for the floor (floor care, "Floor setup …"). From another floor the sign still leads back (#15)
- **Descriptions in Markdown are shown formatted:** the binders in a room or corridor render a description written in the room setup like a board post (headings, lists, bold, links in a new tab, code), sanitised the same way; descriptions written in Mumble look as before (#5)
- **Ruumble's dialog to set up a room or floor:** room name, description in Markdown with a preview, available seats (Mumble's maximum users). The description is stored as plain text with the marker line `<!-- ruumble:markdown -->` (never as HTML). Needs Ruumble Client 0.38 or newer (#15)

## [0.37.0] - 2026-11-06

Plugin 0.5.0 (unchanged).

### Changed

- **"Do not disturb" is now called "Notices muted"** ("Hinweise stumm"), which is what it does: Ruumble's sounds, cues and desktop notifications stay quiet in this browser and are only counted, a nudge still rings through. Voice and everything else are unchanged, and others do not see it
- **Muted notices show at the own avatar:** while they are muted, a crossed-out bell sits at the bottom left of the avatar on the name badge, opposite the status tag; a click on it turns notices back on (#12)
- **The user menu is sorted:** notices muted, dark mode and language are quick switches as three tiles at the top; below them "Go to my floor", "My status …" and "Notice settings …" (was "Notices …"), then "My keys" and the keyboard shortcuts (#12)
- **Channels below the rooms are ignored** instead of locking the whole floor: the floor shows its rooms as usual, the deeper channels and the people in them are not drawn (in the directory board they are "elsewhere"). A building without any floor still says "Vacant"
- **The light switch:** the dark mode tile in the user menu follows the building and says what it does: "Turn the light off" in the light theme, "Turn the light on" in the dark one
- **Keyboard:** comma and full stop no longer switch the tabs of Ruumble in a box (the arrow keys in the tab list still do)
- **Windows stand off the page:** the dialogs (shortcuts, building overview, care and maintenance, the post editor) get a fine ring, a deep soft shadow and the yellow band of the name badge on top, in both themes
- The building overview's hint names **T** for a quiet word (was still P)
- **The building stands on its site:** around the floor plan a cool light blue-grey (a slightly lighter dark in the dark theme), and the floor plan casts a soft shadow to the bottom and right, clearer in the dark theme
- On a floor with more rooms than fit, the corridor's plant and binders stay at the right edge of the view instead of at the far end of the floor plan, out of sight
- The building overview can no longer be scrolled sideways when its search field gets the focus (the header moved to the left, the directory board was cut off on the right)

## [0.36.0] - 2026-11-05

Plugin 0.5.0 (unchanged). Ruumble in a box becomes the one window for what is said: the quiet words move into it as tabs, next to the room's log in Ruumble Client. It docks where it covers neither the own room nor the board, and it shares one width and one look with the board. Nothing to do when updating; users press **T** instead of P for it.

### Changed

- **Ruumble in a box holds the quiet words:** one window with a tab per person and, inside Ruumble Client, first a tab (an icon) for the own room with Mumble's log and chat. One button at the top right, where the quiet word's button was, counts everything unread
- **Keyboard:** **T** ("talk") opens and closes Ruumble in a box and, on a person in the directory board, starts a quiet word (was P); **B** stays the board
- **Where the box docks:** at the top when the own room is in the bottom row of the floor plan, else at the bottom; on the other side of the floating board (also while the board is hidden), else at the left. It covers the other row of rooms and most of the corridor but stops 16 px short of the own row, and reaches 5 px past the floor plan's outer wall, so it is seen to float
- **The floating board** stays on the right unless the own room leaves room for it only on the left; with the own room in the middle it no longer swaps sides while the window resizes
- **One width for board and box:** between 300 px (narrow windows) and 500 px (from 2000 px wide), also in Ruumble Client; the board was 340 px, the box 420 px
- **One look for board and box:** the same search field, the filter as a menu button, square input fields and the dark send button; the room's input says "Message in <room>"
- A quiet word: no line of keyboard hints below the input any more (they are in the list of shortcuts, ?)
- People in the corridor stand in its middle instead of next to its name on the left

## [0.35.0] - 2026-11-05

Plugin 0.5.0 (unchanged). Inside Ruumble Client, Mumble's log and chat become "Ruumble in a box" and Mumble's functions move into the elevator; the dialogs get one rule for their buttons, and the tube mail's send dialog is easier to follow. Nothing to do when updating.

### Added

- Ruumble in a box (Ruumble Client): Mumble's log and channel chat open with a button next to the floor sign. A search finds entries while typing, a filter shows all, only messages or only notices (remembered in this browser), and a "New" line marks where the unread messages start
- Elevator footer (Ruumble Client): Mumble's functions with labels at the bottom of the elevator: City Map, configuration, room acoustics assistant, all Mumble functions (F10) and Leave. Released clients up to 0.35.1 open Mumble's connection dialog for "City Map", newer ones the Ruumble City Map

### Changed

- The elevator shows everyone online in its head, next to "Elevator", and is a little wider; the server's name is no longer shown there (it stays on the roof of the building overview)
- Dialogs: a form's main action (Send, Set status) stands at the bottom right with "Cancel" before it; "Close" in the other dialogs is no longer drawn like a main action
- Tube mail, send dialog: says what is missing before a file can go, explains what a room picks (people icon and tooltip), lists the people in the own room first and starts with the focus on the file instead of the close button
- Tube mail has a parcel as its icon instead of a file with an arrow, so it stands apart from "Ruumble in a box"

### Fixed

- Tube mail, send dialog: a file that is empty or larger than 500 MB, and a refused offer, now show their reason in the dialog; before, the notice appeared behind the dialog and dropping such a file seemed to do nothing

## [0.34.0] - 2026-11-05

Plugin 0.5.0 (unchanged). Ruumble moves to the organization `ruumble-project`; the image is now `ghcr.io/ruumble-project/ruumble`.

### Changed

- The project moved to the organization `ruumble-project` and is split in two repositories: this one, `ruumble-project/ruumble-server` (service, web UI, plugin), and `ruumble-project/ruumble-client` (Ruumble Desk, released there from now on). From the next release the image is `ghcr.io/ruumble-project/ruumble`; Compose files on `ghcr.io/kevinwebman/ruumble` need the new image name (ADR-0025)
- Ruumble Desk is now called Ruumble Client; the web UI's texts inside the client say so

## [0.33.1] - 2026-11-04

Plugin 0.5.0 (unchanged). Fixes the Ruumble Desk AppImage, which crashed when connecting to a service over HTTPS.

### Fixed

- Ruumble Desk AppImage: no longer crashes when connecting to a Ruumble service over HTTPS; it now carries all of NSS (Chromium's crypto) instead of mixing its own with the system's
- Ruumble Desk: in narrow rooms the number of people moves behind the name, as in a normal browser; Desk's engine (Chromium 102) has no container queries, so the web UI measures the room itself there
- Ruumble Desk: no more "Hover once over the top channel" hint in the log; Desk loads the description itself

### Changed

- Ruumble Desk: the "not paired" and "Mumble offline" screens no longer offer the plugin download and its install steps; Desk pairs itself, and offline a button opens the client's connect dialog

## [0.33.0] - 2026-11-04

### Added

- Ruumble Desk panel: inside the Ruumble Desk client (Mumble fork with Ruumble built in, ADR-0024 draft), a button in the top bar opens the Mumble log and channel chat and the client's server, audio and settings dialogs; in a normal browser nothing changes
- Ruumble Desk (`desk/`): the Mumble 1.6 client with Ruumble built in now lives in this repo; every release attaches it as an AppImage for Linux x86_64

- Ruumble Desk: administer the building like in Mumble. A right click on a room, corridor, floor sign, a floor in the elevator or a person opens Mumble's own menu for it (add, edit and remove rooms, ACL, links, kick, ban, register, mute, ...), the building line at the foot of the elevator the menu of the whole server (a new floor); the room menu also moves a room to another floor; people are dragged onto another room to move them. All with the user's own Mumble permissions; in a normal browser nothing changes
- Ruumble Desk: "Mumble settings" and "Mumble menu" left the user menu; they are in the Desk panel (log and chat)

### Fixed

- Ruumble Desk: its own D-Bus name; before, starting it with a `mumble://` link while the official Mumble ran handed the link to the official client, which then left its server
- Ruumble Desk: person cards and room descriptions no longer show up in the wrong place or stay open, the board has its light background again and its width is right. Desk's engine (Qt WebEngine 6.4, Chromium 102) lacks the popover API, `color-mix()` and container units; the web UI now loads a popover polyfill only where it is missing, has plain fallbacks for the rest, and is built for Chromium 102 as well. Ruumble Desk also brings these fixes itself, so it works with services that still run an older web UI
- Ruumble Desk: with a service whose web UI has no Desk panel yet (older than this version), Mumble's own log and chat are shown beside the building, so there is always a chat; the Mumble menu (F10) switches them with "Mumble log and chat"
- Ruumble Desk: on its first start it takes over the audio settings and shortcuts (push-to-talk) of an installed official Mumble once; before, it started with Mumble's defaults and push-to-talk did not work

### Changed

- The project moved to `KevinWebman/Ruumble-Desk`: the image is now `ghcr.io/kevinwebman/ruumble`; the online demo on GitHub Pages is discontinued (`pnpm -F @ruumble/web build:demo` still builds it locally); update the image line in your Compose file with the next upgrade

## [0.32.1] - 2026-11-03

Plugin 0.5.0 (unchanged). Security update of a service dependency; the repository is now `Skrrytch/Ruumble`.

### Changed
- The GitHub repository is now `Skrrytch/Ruumble` and the demo is at <https://skrrytch.github.io/Ruumble/>. Old links to `Skrrytch/ruumble` are redirected by GitHub; the image stays `ghcr.io/skrrytch/ruumble` (image names are lowercase).

### Security
- `fast-uri` (used by Fastify's schema validation) updated to 3.1.9 and 4.2.3 (URI scheme spoofing, host confusion).

## [0.32.0] - 2026-10-28

Plugin 0.5.0 (unchanged). Notices that reach you while Ruumble is in the background: the tab title, the tab icon, the app badge and desktop notifications, set per browser in a new notices dialog, with a do-not-disturb switch.

### Added
- **Notices while Ruumble is in the background.** A nudge, a quiet word or a file in the tube for you now shows in the tab title (`(2) Room · Ruumble`, flashing a few times for these), as a dot on the tab icon and, in the installed app, as a number on its icon. All of it goes when you come back to the window (ADR-0023).
- **Notices dialog and desktop notifications.** "Notices …" in the user menu sets, per browser, what Ruumble does for each event: off, count only, a short cue, or a notice with sound. Desktop notifications are asked for once and shown only while the window is not in front; they name who it is from, not the text unless you want it. A "Do not disturb" switch keeps everything quiet except a nudge, which always rings through.
- **Someone comes into your room, or posts on its board.** A short cue shows for a few seconds for entering ("Short cue in the room"), and a board post by someone else counts in the title, tab icon and app badge while the window is in the background ("Count only"). Both can be changed or switched off in the notices dialog.

### Changed
- "Sound when nudged" is now the nudge's level in the notices dialog (an earlier "off" carries over). A private message now plays the same sound by default.
- The pairing code in the Mumble log has no space any more (`482913`), so a double click selects all of it. The page accepts it with or without spaces.

### Upgrading
- No configuration changes needed: change the image tag to `0.32.0` and restart. The notices are set per browser; the service stores nothing new.

## [0.31.0] - 2026-10-22

Plugin 0.5.0 (unchanged). Tube mail hands files directly to other people, private messages are now "A quiet word", and the status sits at the name badge.

### Added
- **Tube mail.** Hand a file to people who are in Ruumble at the same time: "Send a file" on the person card, in the new tube mail panel (a file with an arrow in the top bar), or drop a file on a person or a room (a file dropped anywhere else is ignored instead of replacing Ruumble in the tab). Pick people one by one or everyone with Ruumble in a room, add a note. Each recipient sees who sends what and accepts or declines; accepting is a normal browser download, and a line in the Mumble log tells them about it too. The panel shows every recipient's state and progress and lets you withdraw a parcel. Nothing is stored on the server: the file stays in the sender's tab and passes through the service piece by piece, so the sender keeps the tab open until everyone has it (at most 8 hours). Up to 500 MB and 50 recipients; files that can run programs come with a warning ([how it works](docs/tube-mail.md), ADR-0022).
- **Tube mail bandwidth** in the building maintenance: all transfers together, 16 Mbit/s by default (`TUBE_MAIL_MBIT`), 0 for unlimited, so files do not crowd out Mumble's voice.

### Changed
- **Status at the name badge.** The own status is a small tag at the avatar of the name badge, as at every avatar in the floor plan, instead of a button in the toolbar: filled while a status is set, dashed while none is. A click on your own avatar in the floor plan opens it too, as do "My status …" in the user menu and S. Status tags are filled so a set status stands out, and their tooltip shows just the text and its expiry, without "Status:".
- **Tube mail is now "A quiet word".** Private messages between two people are called "A quiet word" (German "Unter vier Augen"), the person card offers "Have a quiet word"; the Mumble-log line reads "Message from Anna: …". Conversations kept by the browser carry over. The name "tube mail" is kept for sending files between people.

### Upgrading
- No configuration changes needed: change the image tag to `0.31.0` and restart. The new `TUBE_MAIL_MBIT` (default 16) is optional and can also be set in the building maintenance.
- The service stores no files sent by tube mail; they only pass through. Nothing new to back up.

## [0.30.0] - 2026-10-22

Plugin 0.5.0 (unchanged). Tube mail for private messages between two people, a person card for everyone with Ruumble, and clearer symbols in the top bar.

### Added
- **Tube mail.** Private messages between two people who use Ruumble, wherever they are in the building. Hover someone with Ruumble and choose "Send tube mail", or use the conversation symbol beside them in the directory board (H), also P on the focused person. A window at the bottom right has one tab per person and shows where the other one is right now, with their status and "Go there"; "Come over!" invites them to your room, and messages take the board's quick reactions. New messages show a notice with "Reply", the button with two speech bubbles in the top bar counts the unread ones, and texts also appear in the recipient's Mumble log. P opens and closes the window, comma and full stop switch tabs, Escape closes it. The service only passes messages on; your browser keeps a conversation for 24 hours after its last message, "Forget history" removes it at once, and revoking the browser's key removes them all (ADR-0021).

### Changed
- **Person card for everyone with Ruumble.** Hovering someone who uses Ruumble shows a card with their states and "Send tube mail" instead of the plain tooltip, shortly after the pointer rests on them; "Nudge" stays limited to deafened people in your room.
- **Status as a tag.** The status is a small tag at the avatar and in the top bar instead of a speech bubble, which now stands for tube mail.
- **Mute and deafen as a pair.** The two buttons in the top bar form one joined pair, set a little apart from tube mail and status.

### Upgrading
- No configuration changes: change the image tag to `0.30.0` and restart.
- The service stores no tube mail; it only passes messages on between connected browsers. Nothing new to back up.

## [0.29.0] - 2026-10-19

Plugin 0.5.0 (unchanged). A dark mode, a board that floats over the floor plan or shows its posts compactly, and rooms that can be entered with the keyboard again.

### Added
- **Dark mode.** The web UI follows the system's light or dark setting, also when it changes while the page is open; "Dark mode" in the user menu switches it, and the browser remembers the choice. The dark theme uses calm slate greys with muted walls; the board has a warm grey of its own, so it stands apart from the floor plan, and menus, popovers and dialogs are a lighter grey with a fine edge, so they stand out from the page. The theme is set before the page is drawn, so a dark screen never flashes white.
- **Board view menu.** A new "View" menu (sliders icon) in the board's header holds two settings, both remembered by the browser. The menu stays open while choosing and closes on a click elsewhere or Escape.
- **Floating board.** "Floating" instead of "Integrated" lets the board float over the floor plan instead of taking its own column, so the rooms keep their full width. It floats on the side where your own room stays fully visible and changes sides when you move.
- **Compact posts.** "Compact" instead of "Normal" shows one line per post: the avatar, the message and its reactions. Images, files and code become small placeholders that open the post; the bar of actions that appears on hover names the author beside the time.
- **Edit a board post directly.** A pencil next to "Open" in a post's actions opens it straight in editing (for images and files: their description).

### Changed
- **Readable links and code.** Links, link chips and strings in code have their own link colour, which stays readable in the dark theme. Comments in code can be read in both themes. A code preview that is wider than its card fades out on the right until it is scrolled to the end.

### Fixed
- **Entering rooms with the keyboard.** Since rooms are entered with a double-click (0.28.2), Enter and Space on a focused room did nothing. They enter it again, in the floor plan as well as in the cross-section and the directory of the building overview. The mouse still needs a double-click.
- **Building overview stays open.** The lantern (building maintenance) and the plants (building care) open their dialog on top of the overview instead of closing it; closing the dialog returns to the overview.

## [0.28.2] - 2026-10-07

Plugin 0.5.0 (unchanged). Room entry requires a double-click instead of a single click.

### Changed
- **Double-click to enter a room.** Clicking a room, the cross-section or the directory no longer enters it immediately; a double-click is required. This prevents accidental moves when scrolling or clicking through the UI.

## [0.28.1] - 2026-10-06

Plugin 0.5.0 (unchanged). A friendlier front of the building in the building overview.

### Changed
- Building overview: the building care is now behind two potted plants on either side of the steps to the front door, standing a little in front of the building; on the right, beside the building, stands a slim cypress instead, its crown reaching in front of the wall.
- The user menu names the versions "Mumble …" and "Ruumble …" instead of "Server …" and "Interface …".

## [0.28.0] - 2026-10-06

Plugin 0.5.0 (unchanged). Channel descriptions from Mumble behind binders, and a nudge for people who deafened themselves.

### Added
- **Descriptions from Mumble.** A room, corridor or open floor with a description in Mumble shows two binders, in a room left of the board. They open the description as a popup, a third of the window wide and up to 80 % of its height, with nothing but the description: formatting, links and embedded images stay; links open in a new tab. Escape, a click beside it or on a link closes it; a click beside it does nothing else, so it enters no room. Images from other servers and inline styles are left out.
- **Nudge.** Someone deafened in Mumble hears nothing, not even Mumble's sounds. Hover them in your own room and press "Nudge" in the card, or use the bell beside them in the building overview: they get a line in their Mumble log and, in Ruumble, a notice with two short tones from the browser. Only for deafened people in your own channel who use Ruumble, once a minute per person. "Sound when nudged" in the user menu switches the tones off for this browser (ADR-0020).

## [0.27.0] - 2026-10-05

Plugin 0.5.0 (unchanged). A status everyone can see, a building overview with the lobby's directory board, and keyboard shortcuts at a glance.

### Added
- **Status.** The speech bubble in the top bar, or the key S, sets a short status of your own, such as "In a meeting until 2 pm" (up to 80 characters; a counter shows from 60 on). Everyone in Ruumble sees it as a speech bubble at your avatar, with the text and the expiry in its tooltip. It expires after 2 hours by default; choose 30 minutes to 8 hours or "never" instead, or clear it any time with the icon next to the current status. The five texts you used last are offered for a quick choice. The service keeps the status per person, so it follows you to other browsers; someone without a status for 90 days is forgotten, recent texts included. Plain Mumble clients do not see it: Mumble's plugin API cannot set the user comment (ADR-0018).
- **Building overview.** Click "N online" at the bottom of the elevator, or press H. On the left the building from the side: floors stacked under the roof, your floor marked in the elevator shaft, everyone as a small avatar grouped by room, a front door with steps up from the street. On the right the lobby's directory board: every floor with its people, their room and status. Search by name, room, status or floor; click a person or a group to go to their room, Enter goes to the first match, and where you cannot go the tooltip says why. For building admins the lantern beside the building opens the building maintenance and the plant the building care (ADR-0019).
- **Who uses Mumble without Ruumble.** A small plug at the bottom left of an avatar marks people without a connected Ruumble plugin; the tooltip says "without Ruumble (Mumble only)".
- **Keyboard shortcuts at a glance.** Press ? (or choose "Keyboard shortcuts" in the user menu) for B (board), H (building overview), S (status) and Esc.
- The browser tab is named after your room, e.g. "Let's talk · Ruumble".

### Changed
- **Care is for building admins.** Every plant (room, floor and building) needs Mumble's Write permission on the root channel. Write on a single room or floor no longer opens its plant; it still lets you delete others' posts on that board.
- Building care and building maintenance moved from the entrance in the elevator to the plant and the lantern beside the building in the building overview.

### Fixed
- A dialog opened right after another one closed, for example the status with S right after setting it, could close again at once.

### Upgrading
- No configuration changes: change the image tag to `0.27.0` and restart.
- The service keeps the statuses in `statuses.json` in the data directory, next to `tokens.json`; include it when you back up the volume.
- Whoever tended a single room or floor through Write on just that channel now needs Write on the root channel (usually the `admin` group there).

## [0.26.0] - 2026-10-03

Plugin 0.5.0 (unchanged). A new floor plan with flatter rooms, and exports through a "Save as" dialog.

### Changed
- **Flatter rooms, names at the door.** Name and head count of a room are a door plate on the corridor side next to the door, with the board and the plant beside it; the people fill the room from the far wall. A room needs about 200 px for two rows of people instead of about 270, so the web UI fits windows down to about 640 px high. The people stand in the middle of their area, every row centred. Where more people are in a room than fit, the last tile shows "+n" with the others' names in its tooltip; your own avatar always stays visible. Narrow rooms show the head count as a small number behind the name. Names under the avatars are a little smaller, so most fit whole.
- **The door tells whether you may enter.** It stands ajar (45°) where you may and is closed where Mumble does not let you in.
- **Calmer top bar.** The room sign shows only the room's name, centred; the floor sign has no head count any more (the elevator lists every floor with its count), and the elevator opens with a plain chevron.
- "Entering …" appears on a room only when Mumble takes longer than 0.6 s, instead of flickering on every move.
- **Export with a "Save as" dialog** where the browser has one (Chrome, Edge and other Chromium browsers on the desktop, over HTTPS): you choose the place, and the ZIP is written there while it downloads instead of being held in the browser first. In an installed web app this also avoids the download bubble at the window edge. Other browsers download as before.
- Building maintenance: hints about invalid values or changes that delete data are shorter and stand in the footer instead of the house rules, so the dialog keeps its height.

### Upgrading
- No configuration changes: change the image tag to `0.26.0` and restart.

## [0.25.1] - 2026-10-03

Plugin 0.5.0 (unchanged).

### Changed
- **Smaller windows.** The web UI scales down to 1000 px wide (before: 1440 px) and in height until every room still holds two rows of people (about 780 px); only below that does the page scroll. From 1440 px on nothing changes: the open board keeps 340 px and gets half of every pixel beyond.
- Ruumble may be reachable from the internet behind an HTTPS reverse proxy; the operations guide says what the service protects itself and what the operator should do ([HTTPS → On the internet](docs/operations/https.md#on-the-internet)). Plain HTTP stays for LAN and VPN.

### Upgrading
- No configuration changes: change the image tag to `0.25.1` and restart.

## [0.25.0] - 2026-10-03

Plugin 0.5.0 (unchanged). Care of the stored data for Mumble admins, settings and keys in the web UI, a richer and more compact board, and protection against forged identities. 0.20.0 to 0.24.0 were not published; their changes are included here.

### Added
- **Care of the stored data.** A potted plant stands in every room, at the end of every corridor and at the entrance in the elevator. Mumble admins (Write permission on that room, floor or the root channel) can click it; for everyone else it is decoration.
  - **Room care**: see how many posts and how much attachment space a board holds, delete posts older than 7 days, 14 days, 1, 3 or 6 months, clear the board (the people in the room get a notice in the Mumble log for both), and export the board as a ZIP (all posts as Markdown plus the attachments).
  - **Floor care**: all rooms of the floor with their numbers; move a board from any room, current or deleted, to a room of the floor (e.g. after a room was recreated in Mumble); rooms of the floor that were deleted in Mumble or moved out of the floor plan and still hold data, removed one by one or all.
  - **Building care**: storage used and per floor; floors that were deleted, with their data; every learned ticket link of the building with a reset per project or for all, e.g. after a first link to the wrong Jira.
- **Building maintenance.** A wrench next to the plant at the entrance, for admins: how long posts are kept, the storage quota, the largest file, how long data of deleted rooms is kept and the Mumble notice for new posts, changeable without a restart; the environment variables are the defaults. Changes that make the next cleanup delete data ask first. Everyone else's keys are listed there too, each revocable.
- **My keys.** In the user menu: every paired browser is a key. Everyone sees their own (browser and system, paired on, last used) and can revoke one, e.g. after losing a laptop.
- The care dialogs, the building maintenance and "My keys" share one look along the building metaphor: a site plan of the level, door plate or floor button, a breadcrumb to move between building, floor and room, the house rules in the footer, and confirmations in a small popup of their own instead of a browser prompt.
- **Copy to another room.** The "…" menu of every post offers "Copy to room …" with the rooms you may enter in Mumble, your own floor first, e.g. to take the final SQL from a meeting room back to your team room. The copy is your post there and says where it came from ("from “Meeting”, by Ben"); the people in that room get a notice in the Mumble log. Ticks in a task list are copied, reactions are not. Attachments are not stored twice.
- **Ticket keys become links.** Once anyone on the server has posted a link to an issue (`https://jira.example.com/browse/TAG-1`), a plain "TAG-1366" in text, captions and task lists links to it, without any configuration in Ruumble or Jira. Only the shape of the URL counts, nothing is fetched. The oldest post wins, so a later link cannot redirect a known project, and what is learned goes away with the posts it came from. A board only receives the projects that appear in its own posts.
- **Links in code are clickable.** URLs in code posts, logs and stack traces open in a new tab, and below a code post its links are listed (up to three, then "+ N more", which opens the post), so a ticket or PR link far down in a log is one click away.
- **Short form for well-known links.** Instead of a long URL, a link shows what it points to, read only from the shape of the URL (nothing is fetched, self-hosted instances work too): "PR #13 · ruumble", "MR !42 · app", "#42 · ruumble", "a1b2c3d · ruumble", "CI · ruumble", "Pipeline #98765 · app", "TAG-1366", the title of a Confluence page or Stack Overflow question, otherwise the host and a shortened path. The full URL is in the tooltip. Links with their own text stay as written.
- **Icons in all common sizes:** PNG 192/512 (also maskable for Android), an Apple touch icon and `favicon.ico` with a pixel-drawn 16 px version, next to the existing SVG. The web app's manifest lists them, and every release carries them as `ruumble-icons.zip`.

### Security
- **Nobody can take over a connected identity.** A second plugin connection for a user who is already connected is refused unless it comes from the same address or from the address Mumble sees for that user. Before, it replaced the real plugin and could receive a pairing link for that user.
- **New browsers are announced.** When a browser is paired, the owner gets a notice in the Mumble log ("… If that was not you, revoke the key under My keys"), and once more when their plugin connects from another address within 30 days.
- **Only Ruumble's own pages may use the login cookie.** Requests to the web UI's WebSocket and every changing request from another page are refused, and no web page can pose as the plugin.
- `TRUST_PROXY` takes the proxy's address or network instead of `true`, so clients that reach the port directly cannot fake their address ([ADR-0017](docs/decisions/0017-threat-model-after-board-and-care.md)).

### Changed
- **Posts are kept for one year** by default instead of 30 days (`RETENTION_DAYS`).
- **Compact board.** A one-line post takes about half the height, a series of short posts about a third:
  - the author is one line ("Anna · 5 min ago") with a smaller avatar,
  - the actions (open, react, copy or download, "…") appear at the bottom right of a post when you point at it or reach it with the keyboard, and the post you point at is lightly tinted; the pin dot for "keep on top" appears the same way,
  - posts by the same person at most 10 minutes apart join into one card with a single name line; the time of each is shown with its actions,
  - less space between and inside the cards.
- The "…" menu is on every post; "Delete" in it is still only offered where you may delete. Its item reads "To room …" next to its icon.
- **Large boards export without strain.** The ZIP is streamed while it downloads instead of being built in memory, so the service stays responsive and within its memory limit; archives above 4 GB work too (ZIP64). An attachment missing on the server is named in `board.md` instead of failing the export.
- **Uploads go straight to disk.** A file is written while it arrives and stops at the size limit, instead of being held in memory first.
- An image built from an untagged commit shows that commit under `/api/version` and in the start log (`BUILD_VERSION`, docs/development.md).

### Fixed
- Board: hidden actions and pin dots no longer catch clicks meant for the post next to them.
- Board: opening the "…" menu of another post closes the one that is open; near the bottom of the list it opens upwards instead of being cut off.

### Upgrading
- Back up the volume, change the image tag to `0.25.0` and restart. The board database migrates itself (new columns and tables); rooms deleted before the upgrade appear under "Unknown floor" in building care.
- If `RETENTION_DAYS` is not set, posts are now kept for a year. Set `RETENTION_DAYS=30` to keep the old behaviour. `RETENTION_DAYS` must be a whole number from 1 to 3650 and `BOARD_QUOTA_MB` at least 10; otherwise the service does not start and says which value is wrong.
- Behind a reverse proxy, set `TRUST_PROXY` to the proxy's address or Docker network (e.g. `"172.18.0.0/16"`); `"true"` still works but logs a warning. If the proxy does not pass the original `Host`, set `PUBLIC_URL`, otherwise the web UI cannot post or save.
- Behind a reverse proxy, allow request bodies a little above the largest file admins may set (at most 100 MB), e.g. `client_max_body_size 110m;` in Nginx; otherwise larger uploads fail with `413` from the proxy.
- Browsers paired before the upgrade show "Unknown browser" under "My keys" until they connect again.

## [0.19.0] - 2026-10-02

Plugin 0.5.0 (unchanged). A new layout with more room for the floor plan, and a board that points out new posts. 0.16.0 to 0.18.0 were not published; their changes are included here.

### Added
- **New posts stand out.** With the board closed, a yellow note lands on the board toggle in your own room when someone else pins something; it stays until you open the board, and those posts light up once there. With the board open, a new post is pinned on from above and glows; if the list is scrolled down, a "1 new post" button leads up to it. What you have seen is remembered per room in the browser.
- **Delete from the card:** a "…" menu next to copy/download offers "Delete" for posts you may delete (your own, or all as a Mumble admin), with the same confirmation as the popup.
- The mock's debug panel can simulate a post by someone else.

### Changed
- **Top bar instead of the left column**, so the floor plan gets the full width. It is made of signs:
  - on the left the **floor sign** with the current floor and its head count; its elevator buttons open the **elevator** as a dropdown (floors with their head counts, the entrance below the ground floor, and a status bar with everyone online and the server name),
  - in the middle the **room sign** of your own place with its head count; when you look at another floor, it takes you back,
  - on the right mute, deafen and your **name badge**, which opens the user menu ("Go to my floor", language, versions).
- **Room widths follow occupancy:** a room gets wider with every person in it (up to 8), and the change glides. This replaces the fixed sizes by Mumble order.
- **Many rooms scroll sideways:** up to 3 rooms per row (6 per floor) are in view; with more, only the floor plan scrolls (scrollbar or mouse wheel) while the top bar and the board stay put. The corridor label stays in view and your own room is scrolled into view.
- **Full window width:** the web UI no longer stops at 1440 px. 1440 px is now the minimum width (narrower windows scroll), and the open board gets half of the width beyond it.
- The operations guide is split into short pages: setting up (`docs/operations.md`), and under `docs/operations/` HTTPS, backup and updates, troubleshooting, Mumble tips and the configuration reference.

### Removed
- The "Too many rooms" lock: floors with more than 8 rooms are shown and scroll sideways. Only floors nested deeper than two levels are still locked.

### Upgrading
- No configuration changes: change the image tag to `0.19.0` and restart. The board data stays as it is.

## [0.15.0] - 2026-09-30

Plugin 0.5.0 (unchanged). Easier setup: the Compose templates need no edits.

### Added
- `deploy/compose/mumble-with-ruumble.docker-compose.yml`: Mumble server and Ruumble in one file for a new setup, and `setup.sh`, which creates the Ice secrets and prints the line for the root channel description.
- The operations guide starts with a four-step quick setup; troubleshooting table with the typical log messages.
- Demo of the web UI against the mock on GitHub Pages: <https://skrrytch.github.io/Ruumble/>.
- README with a quick start, security policy, contribution guide, issue templates.

### Changed
- **`PUBLIC_URL` is optional.** Without it, pairing links use the address the plugin connected to (behind a reverse proxy with `TRUST_PROXY` including `X-Forwarded-Proto`), which is the address users open. Existing setups that set it keep working unchanged.
- The Compose templates publish port 64080 on all interfaces instead of a `<LAN-IP>` placeholder; on a server with a public address, bind it to the LAN or VPN address (see the operations guide).

### Fixed
- An unreadable `ICE_SECRET_READ_FILE` (e.g. owned by root with mode 600) now stops the service with a clear message; the guide recommends mode 644 for the files and 700 for the `secrets` folder.
- The Mumble Compose template no longer requires the external network `homeserver-network`.

## [0.14.0] - 2026-09-30

Plugin 0.5.0.

### Added
- Plugin for **Windows** (x64, Mumble 1.4+), cross-built with MinGW-w64 and TLS via Mbed TLS. One `.mumble_plugin` bundle carries the Linux and the Windows library; Mumble installs the one for its platform (ADR-0013).
- Releases: Docker image `ghcr.io/skrrytch/ruumble` for linux/amd64 and linux/arm64, and a GitHub release with the plugin bundle, the Compose template and checksums.
- `THIRD_PARTY_NOTICES.md`, also in the image under `/app`.

### Changed
- The Compose template uses the published image instead of a locally built one.

## [0.13.2] - 2026-09-29

### Changed
- Board: the confirm button for the title of the post kept on top says "Ok".

## [0.13.1] - 2026-09-29

### Changed
- Board: a post is kept on top via the pin dot instead of the popup.

## [0.13.0] - 2026-09-29

### Added
- Board: keep one post on top of the room (A3).

## [0.12.2] - 2026-09-29

### Changed
- Task lists: `[]` without a space counts as an open task.

## [0.12.1] - 2026-09-29

### Added
- Keyboard shortcut <kbd>B</kbd> shows and hides the board.

## [0.12.0] - 2026-09-29

### Added
- Board: shared task lists (A2). Service and web UI use the same parser.

## [0.11.1] - 2026-09-29

### Changed
- Board: a smiley with a plus instead of a plain plus for adding a reaction.

## [0.11.0] - 2026-09-29

### Changed
- Board: compact layout with search, filter menu and a single toolbar row.

## [0.10.1] - 2026-09-29

### Added
- Board: 14 more quick reactions, the picker is a grid.

## [0.10.0] - 2026-09-29

### Added
- Board: quick reactions with a fixed meaning (A1).

## [0.9.0] - 2026-09-29

### Added
- Pair further browsers with a 6-digit code from the Mumble log (ADR-0012).

## [0.8.3] - 2026-09-29

### Added
- The notice pages show the service and plugin version.

## [0.8.2] - 2026-09-29

### Changed
- Installed web app: reuses the app window and captures links.

## [0.8.1] - 2026-09-29

Plugin 0.4.1.

### Added
- The plugin shows connection problems in the Mumble log.

## [0.8.0] - 2026-09-29

### Changed
- **Port 64080 instead of 8080.** When updating from 0.7, change the port binding (`64080:64080`) and `PUBLIC_URL` in the Compose file, the `ruumble:` line in the root channel description, the link in the welcome message and, behind a reverse proxy, its forward target (`ruumble:64080`). Browsers that used the old address pair once more; users with a fixed `bridgeUrl` in `plugin.json` change it too. To keep the old address instead, set `PORT: 8080`.
- HTTPS behind a reverse proxy: WebSocket keepalive and a setup guide.

## [0.7.2] - 2026-09-28

### Changed
- `/healthz` reports unknown client versions as `unknown`.

## [0.7.0] - 2026-09-28

Plugin 0.4.0.

### Added
- Web UI in German and English (German if the browser prefers it, otherwise English).
- Plugin messages and board notices in German and English.
- Mumble compatibility watch: live tests against real Mumble servers in CI, versions in `/healthz`.

## [0.6.1] - 2026-09-28

### Changed
- Compact board header, real avatars in the user menu and on post cards.

## [0.6.0] - 2026-09-28

Plugin 0.3.0.

### Added
- Short notice in the Mumble log of the others in the room when something is pinned to the board.

## [0.5.1] - 2026-09-28

### Changed
- The opening from the elevator core to the corridor follows the height of the floor plan.

## [0.5.0] - 2026-09-28

### Added
- Board: images (with full-screen zoom) and files up to 10 MB.

## [0.4.0] - 2026-09-28

### Added
- Board in every room with text (Markdown) and source code (ADR-0011).
- Floor layout: room size follows the Mumble position.
- 0.4.1 to 0.4.5: board polish (notes only in the own room, compact header, shortcuts in tooltips, code preview without line numbers).

## Before 0.4.0 - 2026-09-28

Plugin 0.1.0 to 0.2.0.

- The building view: floors, corridor, rooms and elevator derived from the channel tree.
- Service reading the Mumble server via Ice (read-only), plugin for the Mumble client with identity, talking state and commands (join, mute, deafen).
- Pairing with a one-time link (ADR-0004); the plugin finds the service through the root channel description (ADR-0010).
- Real Mumble avatars and presence (quiet, away, recording).
- Docker image with the plugin bundle served under `/download`.

[0.40.0]: https://github.com/ruumble-project/ruumble-server/releases/tag/v0.40.0
[0.39.0]: https://github.com/ruumble-project/ruumble-server/releases/tag/v0.39.0
[0.38.0]: https://github.com/ruumble-project/ruumble-server/releases/tag/v0.38.0
[0.37.0]: https://github.com/ruumble-project/ruumble-server/releases/tag/v0.37.0
[0.36.0]: https://github.com/ruumble-project/ruumble-server/releases/tag/v0.36.0
[0.35.0]: https://github.com/ruumble-project/ruumble-server/releases/tag/v0.35.0
[0.34.0]: https://github.com/ruumble-project/ruumble-server/releases/tag/v0.34.0
[0.33.1]: https://github.com/KevinWebman/Ruumble-Desk/releases/tag/v0.33.1
[0.33.0]: https://github.com/KevinWebman/Ruumble-Desk/releases/tag/v0.33.0
[0.32.1]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.32.1
[0.32.0]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.32.0
[0.31.0]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.31.0
[0.30.0]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.30.0
[0.29.0]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.29.0
[0.28.2]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.28.2
[0.28.1]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.28.1
[0.28.0]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.28.0
[0.27.0]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.27.0
[0.26.0]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.26.0
[0.25.1]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.25.1
[0.25.0]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.25.0
[0.19.0]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.19.0
[0.15.0]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.15.0
[0.14.0]: https://github.com/Skrrytch/Ruumble/releases/tag/v0.14.0

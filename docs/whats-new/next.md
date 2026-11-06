<!--
  The "What's new" page of the next version, for users (#17). tools/release.sh turns it into <version>.md with the
  title, the date and the links to the other versions, and starts this file again.
  Plain, natural English, as a native product writer would put it: short sentences, no jargon, what the user can do or
  see now. Leave out polish users would not notice. Sections: New, Better, Fixed (leave out an empty one).
  Server and Ruumble Client are not told apart; a change that reaches the user only once the server is updated (the
  web UI and the service) gets the orange badge ![server update](https://img.shields.io/badge/-server%20update-e67e22): after the ### heading of a larger change, after
  a ## section heading when every line in it needs the server, else at the end of the line. A short ### heading per larger change, one line per
  small one. Small screenshots where they help: web/scripts/whats-new-shots.mjs writes them to images/next/.
-->

Changes marked ![server update](https://img.shields.io/badge/-server%20update-e67e22) reach you once the Ruumble server you use is updated.

## New

### The room menu ![server update](https://img.shields.io/badge/-server%20update-e67e22)

Click the room sign at the top ("You are here") to open the menu of the room you are in. From there you can show the
**board** and open the **room care**, and, if you're allowed to change the room, open **Room setup**. On the corridor,
the same menu covers the whole floor.

![The room menu with the board and the room care](images/next/room-menu.png)

### Set up a room ![server update](https://img.shields.io/badge/-server%20update-e67e22)

In Ruumble Client, if you're allowed to change a room, **Room setup** in the room menu lets you rename it, write its
description and set how many seats it has. You write the description in Markdown (headings, lists, **bold** text and
links), and the preview shows how it will look.

![Room setup with the description's preview](images/next/room-setup.png)

### Descriptions with headings, lists and links ![server update](https://img.shields.io/badge/-server%20update-e67e22)

The binders in a room show its description. Descriptions written in Room setup now appear with their headings, lists,
bold text and links.

![A room's description behind the binders](images/next/description.png)

### Manage the rooms on a floor ![server update](https://img.shields.io/badge/-server%20update-e67e22)

The **floor care** (the plant on the corridor, or the tile in the corridor's menu) now lists the rooms on the floor and
how many people are in each. In Ruumble Client, if you're allowed to change them, you can **add** a room, **rename** it,
move it **up or down** in the order (also with Alt and the arrow keys) and **delete** it. When you delete a room, you
decide whether to keep its board for later or delete it with all its data, and you can save the board as a ZIP file
first.

![The rooms in the floor care](images/next/floor-care.png)

### A light switch ![server update](https://img.shields.io/badge/-server%20update-e67e22)

The dark mode switch in the user menu is now a light switch, just like in a real building: **Turn the light off** for
the dark look, **Turn the light on** to switch back.

![The quick switches in the user menu](images/next/light-switch.png)

## Better ![server update](https://img.shields.io/badge/-server%20update-e67e22)

- The building now stands on its own site: a soft blue-grey around the floor plan and a gentle shadow make it stand out.
- Windows such as the keyboard shortcuts and the building overview have a frame and a yellow band on top, so they stand
  out from the page behind them.
- A channel inside a room no longer locks the whole floor. The floor shows its rooms as usual; the extra channel is
  simply left out.
- Comma and full stop no longer switch the tabs in Ruumble in a box. The arrow keys in the tab row still do.

## Fixed

- On a floor with many rooms, the plant and the binders on the corridor now stay in view while you scroll. ![server update](https://img.shields.io/badge/-server%20update-e67e22)
- The building overview no longer slides to the side when its search field gets the focus. ![server update](https://img.shields.io/badge/-server%20update-e67e22)
- The building overview now shows the right key for a quiet word: **T**. ![server update](https://img.shields.io/badge/-server%20update-e67e22)
- In Ruumble Client, a right click on a room no longer offers "Add". A channel added there used to lock the whole floor.

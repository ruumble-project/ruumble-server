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

### Push to talk, right in the top bar ![server update](https://img.shields.io/badge/-server%20update-e67e22)

In Ruumble Client, a small tab next to the microphone lets you choose how you transmit: voice activation, push to talk or always on. With push to talk, the microphone becomes your talk button: hold it to talk, let go to go quiet, double-click to keep it open. While you talk, the button turns blue and the line under the top bar lights up, so you always know when others can hear you.

The first time you choose push to talk, Ruumble asks for a talk key and suggests Right Ctrl. On X11 desktops the key works everywhere, even while another window is in front. On Wayland it works while Ruumble Client is in front. You need the new Ruumble Client for this.

## Fixed ![server update](https://img.shields.io/badge/-server%20update-e67e22)

- In Ruumble Client, opening the description of a corridor no longer breaks the floor plan.
- In Ruumble Client, the directory in the building overview fits again: it is no longer cut off on the right, and you can read the full room names.

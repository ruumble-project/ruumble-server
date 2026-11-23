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

## Better

- There is only one lobby now: the old empty one is replaced by the lobby with the cafeteria, as long as nobody is in it. ![server update](https://img.shields.io/badge/-server%20update-e67e22)
- **H** shows and hides the task board of the room you are in. The building overview is on **M** now (for "map"). ![server update](https://img.shields.io/badge/-server%20update-e67e22)
- The board and the task board show short tooltips: "Board (B)" and "Task board (H)". ![server update](https://img.shields.io/badge/-server%20update-e67e22)
- The task board says it plainly: whoever is in the room can ask for help. ![server update](https://img.shields.io/badge/-server%20update-e67e22)

## Fixed

- The light below the cafeteria's sign stays in place when the board is open. ![server update](https://img.shields.io/badge/-server%20update-e67e22)


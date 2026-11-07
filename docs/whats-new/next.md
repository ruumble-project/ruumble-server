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

### See who is listening in ![server update](https://img.shields.io/badge/-server%20update-e67e22)

When someone listens in on a room, everyone now sees who it is. They stand in the room as a pale guest with a dashed ring and a small ear, after the people who are really there, and the room's door stands open. Their own avatar wears the ear too, so you can tell where they are listening. If they use Ruumble, hover over the guest to send them a message.

### A paint bucket for setting up a room ![server update](https://img.shields.io/badge/-server%20update-e67e22)

In Ruumble Client, rooms you may set up now have a small paint bucket next to the plant. Click it to change the room's name, description and seats, just like the new "Room setup" tile in the room menu. To make space, the doors sit a little further along the wall, and the plants have grown a bit.

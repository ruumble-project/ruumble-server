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

### Ruumble Client tells you when a new version is out ![server update](https://img.shields.io/badge/-server%20update-e67e22)

When a newer Ruumble Client is available, a small red dot appears on your name badge, and the user menu offers the new
version at the top. One click opens the download page.

![The new version in the user menu](images/next/client-update.png)

### Update the AppImage with one click

From this version on, the AppImage knows where its updates come from. Tools such as
[Gear Lever](https://flathub.org/apps/it.mijorus.gearlever) or
[AppImageUpdate](https://github.com/AppImageCommunity/AppImageUpdate) update it in place and only download what changed.

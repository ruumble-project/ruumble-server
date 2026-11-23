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

### Ask for help on the task board ![server update](https://img.shields.io/badge/-server%20update-e67e22)

Need a hand, but nobody has time right now or nobody is around? Rooms and corridors can now have a task board. Write what you need in one line, add "until 4 pm", "quick call" or "have a look" if you like, or type `@` to ask someone in particular. A flag on the board shows everyone on the floor that someone is waiting: red while the request is new, green after two hours, and your avatar gets a small hand.

Anyone who may enter the room can help: click **I'll help**, and the card moves to "Being helped". Others with the same problem click **+1**. When it is done, say thanks with a little card: pick a picture, write a line or roll the dice for an idea.

Every change shows up as a plaque on the room's outer wall and in the Mumble log. Turn the task board on in **Set up room** under **Equipment** (in Ruumble Client).

### Meet at the cafeteria ![server update](https://img.shields.io/badge/-server%20update-e67e22)

The lobby below the floors now has a cafeteria, and everyone who is in the lobby takes a seat there: on the sofas, at the round table or at the counter with the coffee machine. When someone is in there, the lights come on, and you see the glow from every floor. A chalkboard sign next to the tube mail button tells you how many are inside; hover it to see who, click it to go there. Inside, the same sign takes you back to the room you came from.

The rest of the lobby has a wall clock with today's date and a reception desk. Ring the bell to visit Ruumble on GitHub, or use the **BUG** and **IDEA** signs in front of it to report a problem or suggest something.

### Room equipment

**Set up room** has a new **Equipment** tab. The board is always there, the binders with the room description can now be switched off, and the task board can be switched on.

## Better

- The board's notes now hang on a cork board on the wall, and the binders and the new task board stand on one line with the room's name plate. ![server update](https://img.shields.io/badge/-server%20update-e67e22)


# ADR-0029: The lobby and its cafeteria

Status: proposed (2026-11-23)

## Context
Working remotely, people miss running into each other at the coffee machine. Mumble's root channel is where people land when they connect and otherwise has no function in Ruumble; it was shown only as a list of people at the entrance in the elevator (#30).

## Decision
| Topic | Decision |
|---|---|
| **What it is** | The root channel is the lobby, and everyone in it sits in the lobby's cafeteria. No setting, no extra channel. The lobby is shown below the floors (`Building.lobby`, level "Lobby", name "Cafeteria", a cup as its badge in the elevator); the floors keep their numbers. |
| **The cafeteria** | A room of fixed size (`CAFE_WIDTH` 780 px, the drawing's ratio) at the top right of the lobby, so its door and the sign beside it keep their distance to the right edge whatever the window; only a smaller floor plan shrinks it. Furniture in fixed drawing coordinates (`CAFE_VIEW`, `CafeteriaInterior.svelte`): a counter with an espresso machine and three stools on the west wall, a round table with five chairs below it, two sofas over the north-east corner (four and five cushions) on a rug with a square low table, a parquet floor. |
| **Seats** | 17 seats, one person each, no two overlapping: taken in the order people came (session), mixed over sofas and table; then people stand (`seating`, `model/cafeteria.ts`). |
| **Light** | Lit while someone is inside: a warm floor, the door and the window glowing in the outer walls. On every floor a cone of light rises out of the north door into the gap below the top bar and one falls out of the east window onto the margin, stronger with more people (`glow`). |
| **The sign** | A chalkboard sign stands in the top bar's row directly left of the tube mail button, the north door directly left of the sign (within the free stretch of the north wall, `doorAt`). It shows the number of people; hovering names them; a click goes to the root channel and the view follows. Inside the cafeteria it shows an arrow and leads back to the room one came from (`returnChannelOf`). |
| **The old lobby** | A building often has an older, empty lobby floor of its own (an open lowest floor named lobby, foyer, reception, entrance, Empfang or Eingang). While nobody is in it, the lobby with its cafeteria replaces it in the elevator and everywhere else (`isOldLobby`, `model/building.ts`), and the floors above keep their numbers. Someone in it brings it back, so nobody is lost. Delete the old channel in Mumble to get rid of it for good. |
| **Colours** | Reserved tokens for the cafeteria only (`--color-wood`, `--color-lamp`, `--color-sofa`, `--color-rug`, `--color-chalk` and their variants). |

## Rejected options
- **A room marked as the cafeteria in the room setup** (built first): needed a channel of its own and a corner layout for open floors; the root channel had no function anyway.
- **Renumbering the floors with the lobby as the ground floor**: changes numbers everyone knows.
- **A cafeteria taking half the floor plan**: its door and sign moved with every window size and collided with the top bar.
- **The sign beside the building on the right**: needed a wider margin around the building.

## Consequences
- The elevator no longer lists the people at the entrance; the lobby is a stop of its own. The building overview still shows them at the entrance storey, named "Cafeteria".
- Who just connected (or forgot to move) sits in the cafeteria and keeps its light on.
- The free part of the lobby is left for later (clock, reception desk with BUG and IDEA, see the concept).

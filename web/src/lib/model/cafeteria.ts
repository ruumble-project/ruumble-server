/**
 * The cafeteria in the lobby (#30), as pure functions: where it lies in the floor plan, where its door to the north and
 * its window to the east are (the light and the chalkboard sign on every floor line up with them), and where its
 * visitors sit. Everyone in the root channel sits in the cafeteria.
 *
 * The furniture is drawn in a fixed coordinate system (CAFE_VIEW, from the concept's draft). The cafeteria has a fixed
 * size (CAFE_WIDTH, with the drawing's ratio) at the top right of the floor plan, whatever the window's size: so its
 * door, and the sign beside it in the top bar's row, keep their distance to the right edge. Only a floor plan smaller
 * than that shrinks it, evenly.
 */
import type { Snapshot } from "@ruumble/protocol";
import type { UserView } from "./building.ts";

/** the drawing's coordinates: the cafeteria including its inner walls */
export const CAFE_VIEW = { x: 442, y: 76, width: 396, height: 256 } as const;

/**
 * the door to the north (to the outside) and the window to the east, in CAFE_VIEW coordinates. The door goes where the
 * chalkboard sign stands in the top bar (left of the tube mail button), within the stretch of the north wall that no
 * furniture stands against: between the stools at the counter and the sofa (`min` to `max`, its left edge)
 */
export const NORTH_DOOR = { x: 548, width: 40, min: 520, max: 598 } as const;
export const EAST_WINDOW = { y: 150, height: 86 } as const;

/** a seat in CAFE_VIEW coordinates */
export interface Seat {
  x: number;
  y: number;
}

/** the seats, in the order they are taken: one per sofa cushion (four above, five on the right), the five chairs at the
 * round table, the three stools at the counter; mixed, so a few people spread over sofa and table */
const NORTH_SOFA: Seat[] = [670.5, 704.5, 738.5, 772.5].map((x) => ({ x, y: 105 }));
const EAST_SOFA: Seat[] = [111, 144, 177, 210, 243.5].map((y) => ({ x: 808, y }));
const TABLE: Seat[] = [0, 72, 144, 216, 288].map((a) => ({
  x: Math.round((500 + 30.5 * Math.sin((a * Math.PI) / 180)) * 10) / 10,
  y: Math.round((276 - 30.5 * Math.cos((a * Math.PI) / 180)) * 10) / 10,
}));
const STOOLS: Seat[] = [120, 154, 188].map((y) => ({ x: 500, y }));
export const SEATS: Seat[] = [
  NORTH_SOFA[1]!, EAST_SOFA[2]!, TABLE[0]!, NORTH_SOFA[2]!, EAST_SOFA[0]!, TABLE[2]!, NORTH_SOFA[0]!, EAST_SOFA[4]!, TABLE[4]!,
  NORTH_SOFA[3]!, EAST_SOFA[1]!, TABLE[1]!, EAST_SOFA[3]!, TABLE[3]!, STOOLS[0]!, STOOLS[1]!, STOOLS[2]!,
];
/** where people stand once every seat is taken: in front of the sofas and beside the door to the lobby */
const STANDING: Seat[] = [
  { x: 690, y: 268 }, { x: 722, y: 268 }, { x: 754, y: 268 }, { x: 580, y: 300 }, { x: 690, y: 302 }, { x: 722, y: 302 },
  { x: 754, y: 302 }, { x: 786, y: 302 }, { x: 560, y: 200 }, { x: 592, y: 200 }, { x: 560, y: 120 }, { x: 592, y: 120 },
];

/**
 * the cafeteria's width in pixels; its height follows from the drawing's ratio (about 505). Chosen so the door, directly
 * left of the sign beside the tube mail button, comes out just left of the sofa
 */
export const CAFE_WIDTH = 780;

/** the cafeteria's place in a floor plan of `width` × `height`: top right, CAFE_WIDTH wide unless the plan is smaller */
export function cafeRect(width: number, height: number): { x: number; y: number; width: number; height: number } {
  const w = Math.max(0, Math.min(CAFE_WIDTH, width, (height * CAFE_VIEW.width) / CAFE_VIEW.height));
  return { x: width - w, y: 0, width: w, height: (w * CAFE_VIEW.height) / CAFE_VIEW.width };
}

/** the door's left edge for a wanted one, kept on the free stretch of the north wall */
export function doorAt(wanted: number): number {
  return Math.min(NORTH_DOOR.max, Math.max(NORTH_DOOR.min, wanted));
}

/** a point of the drawing as a fraction of the cafeteria's width and height */
export function fraction(p: Seat): { fx: number; fy: number } {
  return { fx: (p.x - CAFE_VIEW.x) / CAFE_VIEW.width, fy: (p.y - CAFE_VIEW.y) / CAFE_VIEW.height };
}

/**
 * Who sits where: in the order they came (by session), the first takes the first seat; once the seats are taken, the
 * others stand, and the rest of them share the last standing place
 */
export function seating<U extends Pick<UserView, "session">>(users: readonly U[]): { user: U; at: Seat; seated: boolean }[] {
  return [...users]
    .sort((a, b) => a.session - b.session)
    .map((user, i) => {
      const seated = i < SEATS.length;
      const at = seated ? SEATS[i]! : STANDING[Math.min(i - SEATS.length, STANDING.length - 1)]!;
      return { user, at, seated };
    });
}

/** how bright the light outside is: none when empty, a soft one for one or two, a clear one from three, full from six */
export function glow(count: number): number {
  return count === 0 ? 0 : count < 3 ? 0.5 : count < 6 ? 0.8 : 1;
}

/**
 * Where the own user came from into the cafeteria (the root channel): set when they move from a channel into it, kept
 * while they stay, forgotten once they leave it, or when that channel is gone
 */
export function returnChannelOf(before: Snapshot | null, after: Snapshot, kept: number | null): number | null {
  const own = (s: Snapshot | null) => s?.users.find((u) => u.session === s.self?.session)?.channel ?? null;
  const was = own(before);
  const now = own(after);
  if (now !== 0) return null;
  const from = was !== null && was !== 0 ? was : kept;
  return from !== null && after.channels.some((c) => c.id === from) ? from : null;
}

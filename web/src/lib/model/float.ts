/**
 * Side of the floating board: it floats over the floor plan, on the side where it leaves the own room fully visible.
 * Measured in the browser (the rooms' sizes come from the layout); this is the pure decision.
 */
export type BoardSide = "left" | "right";

/** horizontal extent in px, e.g. from getBoundingClientRect() */
export interface Span {
  left: number;
  right: number;
}

/**
 * `room`: the own room on the shown floor, `null` when it is not on it (other floor, corridor, entrance).
 * On the right, unless the room leaves room for the board only on its left (a room on the right side). A room in the
 * middle, with room on both sides or on neither, keeps the board on the right (and Ruumble in a box on the left): the
 * side never depends on how much of the room stays free, so it does not jump while the window or the rooms resize.
 */
export function floatSide(room: Span | null, plan: Span, boardWidth: number): BoardSide {
  if (!room) return "right";
  const fitsLeft = room.left - plan.left >= boardWidth;
  const fitsRight = plan.right - room.right >= boardWidth;
  return fitsLeft && !fitsRight ? "left" : "right";
}

/** where the own user is on the shown floor plan (ownBand in model/building.ts) */
export type OwnBand = "top" | "bottom" | "corridor" | null;

/** vertical edges of the floor plan's corridor and bottom row, in px from the top of the window */
export interface PlanBands {
  corridorTop: number;
  corridorBottom: number;
  bottomRowTop: number;
}

/** the box stays usable on a small window, even if it then covers a little more */
export const BOX_MIN_HEIGHT = 280;

/** the box stops this far before the row (or corridor) of the own user, so it never reaches it */
export const BOX_GAP = 16;

/**
 * Height of Ruumble in a box (#10): it covers the other row of rooms and the corridor, not the row the own user is in
 * (with the user in the corridor only the bottom row), and stops BOX_GAP before that edge. `edge`: the box's fixed edge (its top when it docks at
 * the top, i.e. the own room is in the bottom row, else its bottom). `null`: no rows to keep clear of (another floor, an
 * open floor), the box keeps its usual height.
 */
export function boxHeight(own: OwnBand, edge: number, bands: PlanBands | null, viewport: number): number | null {
  if (!own || !bands) return null;
  const height = -BOX_GAP + (own === "bottom" ? bands.corridorBottom - edge : edge - (own === "corridor" ? bands.bottomRowTop : bands.corridorTop));
  return Math.round(Math.min(Math.max(height, BOX_MIN_HEIGHT), viewport - 120));
}

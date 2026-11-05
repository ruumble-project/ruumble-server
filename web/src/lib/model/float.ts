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
 * Keeps the current side while it still leaves the room free, so the board does not jump while rooms resize;
 * otherwise the side where the room is free, and if it fits on neither, the side with more room beside it.
 */
export function floatSide(room: Span | null, plan: Span, boardWidth: number, current: BoardSide): BoardSide {
  if (!room) return current;
  const free = { left: room.left - plan.left, right: plan.right - room.right };
  const fits = (side: BoardSide) => free[side] >= boardWidth;
  if (fits(current)) return current;
  const other: BoardSide = current === "right" ? "left" : "right";
  if (fits(other)) return other;
  if (free[other] > free[current]) return other;
  return current;
}

/**
 * Corner of Ruumble in a box (#10): it keeps clear of the own room and of the floating board. At the top when the own
 * room is in the bottom row of the floor plan, else at the bottom; at the right when the floating board is on the left,
 * else at the left. `board`: the side of the floating board, `null` while no board floats.
 */
export function boxCorner(ownRow: "top" | "bottom" | null, board: BoardSide | null): { top: boolean; right: boolean } {
  return { top: ownRow === "bottom", right: board === "left" };
}

/** where the own user is on the shown floor plan: a room in the top or bottom row, the corridor, or none of them */
export type OwnBand = "top" | "bottom" | "corridor" | null;

/** vertical edges of the floor plan's corridor and bottom row, in px from the top of the window */
export interface PlanBands {
  corridorTop: number;
  corridorBottom: number;
  bottomRowTop: number;
}

/** the box stays usable on a small window, even if it then covers a little more */
export const BOX_MIN_HEIGHT = 280;

/**
 * Height of Ruumble in a box (#10): it covers at most the other row of rooms and the corridor, never the row the own
 * user is in; with the user in the corridor only the bottom row. `edge`: the box's fixed edge (its top when it docks at
 * the top, i.e. the own room is in the bottom row, else its bottom). `null`: no rows to keep clear of (another floor, an
 * open floor), the box keeps its usual height.
 */
export function boxHeight(own: OwnBand, edge: number, bands: PlanBands | null, viewport: number): number | null {
  if (!own || !bands) return null;
  const height = own === "bottom" ? bands.corridorBottom - edge : edge - (own === "corridor" ? bands.bottomRowTop : bands.corridorTop);
  return Math.round(Math.min(Math.max(height, BOX_MIN_HEIGHT), viewport - 120));
}

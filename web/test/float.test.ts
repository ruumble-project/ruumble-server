import { describe, expect, it } from "vitest";
import { BOX_MIN_HEIGHT, BOX_OVERHANG, boxHeight, floatSide } from "../src/lib/model/float.ts";

const plan = { left: 0, right: 1000 };

describe("side of the floating board", () => {
  it("own room on the left: the board floats on the right; on the right: on the left", () => {
    expect(floatSide({ left: 0, right: 500 }, plan, 340)).toBe("right");
    expect(floatSide({ left: 600, right: 1000 }, plan, 340)).toBe("left");
  });

  it("a room in the middle keeps the board on the right, however much stays free on either side (no jumping)", () => {
    expect(floatSide({ left: 400, right: 600 }, plan, 340)).toBe("right"); // room on both sides
    expect(floatSide({ left: 100, right: 900 }, plan, 340)).toBe("right"); // room on neither side
    expect(floatSide({ left: 50, right: 800 }, plan, 340)).toBe("right");
    expect(floatSide({ left: 200, right: 950 }, plan, 340)).toBe("right");
  });

  it("own room not on the shown floor: on the right", () => {
    expect(floatSide(null, plan, 340)).toBe("right");
  });
});

describe("height of Ruumble in a box (#10)", () => {
  // window 800 high: corridor from 375 to 490, bottom row from 490
  const bands = { corridorTop: 375, corridorBottom: 490, bottomRowTop: 490 };
  it("covers the other row and the corridor and reaches a little past it, not into the own row", () => {
    expect(boxHeight("top", 776, bands, 800)).toBe(401 + BOX_OVERHANG); // docked at the bottom (776): past the corridor's top
    expect(boxHeight("bottom", 90, bands, 800)).toBe(400 + BOX_OVERHANG); // docked at the top (90): past the corridor's bottom
    expect(boxHeight("corridor", 776, bands, 800)).toBe(286 + BOX_OVERHANG); // in the corridor: the bottom row
  });
  it("keeps a usable height and fits the window; nothing to keep clear of: its usual height", () => {
    expect(boxHeight("corridor", 600, bands, 800)).toBe(BOX_MIN_HEIGHT);
    expect(boxHeight("top", 1200, { ...bands, corridorTop: 100 }, 800)).toBe(680);
    expect(boxHeight(null, 776, bands, 800)).toBeNull();
    expect(boxHeight("top", 776, null, 800)).toBeNull();
  });
});

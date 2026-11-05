import { describe, expect, it } from "vitest";
import { BOX_MIN_HEIGHT, boxCorner, boxHeight, floatSide } from "../src/lib/model/float.ts";

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

describe("corner of Ruumble in a box (#10)", () => {
  it("away from the own room's row and from the floating board", () => {
    expect(boxCorner("top", null)).toEqual({ top: false, right: false });
    expect(boxCorner("bottom", null)).toEqual({ top: true, right: false });
    expect(boxCorner(null, "right")).toEqual({ top: false, right: false });
    expect(boxCorner("bottom", "left")).toEqual({ top: true, right: true });
    expect(boxCorner("top", "left")).toEqual({ top: false, right: true });
  });
});

describe("height of Ruumble in a box (#10)", () => {
  // window 800 high: corridor from 375 to 490, bottom row from 490
  const bands = { corridorTop: 375, corridorBottom: 490, bottomRowTop: 490 };
  it("covers the other row and the corridor, never the own row", () => {
    expect(boxHeight("top", 776, bands, 800)).toBe(401); // docked at the bottom (776): up to the corridor's top
    expect(boxHeight("bottom", 90, bands, 800)).toBe(400); // docked at the top (90): down to the corridor's bottom
    expect(boxHeight("corridor", 776, bands, 800)).toBe(286); // in the corridor: only the bottom row
  });
  it("keeps a usable height and fits the window; nothing to keep clear of: its usual height", () => {
    expect(boxHeight("corridor", 600, bands, 800)).toBe(BOX_MIN_HEIGHT);
    expect(boxHeight("top", 1200, { ...bands, corridorTop: 100 }, 800)).toBe(680);
    expect(boxHeight(null, 776, bands, 800)).toBeNull();
    expect(boxHeight("top", 776, null, 800)).toBeNull();
  });
});

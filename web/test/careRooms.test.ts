import { describe, expect, it } from "vitest";
import { inBuildingOrder, moved, positionChanges } from "../src/lib/care/rooms.ts";
import { nameProblem } from "../src/lib/model/roomEdit.ts";

describe("rooms in the floor care (client#12)", () => {
  it("rows follow the floor plan; rooms the building does not show come last", () => {
    const rows = [{ channelId: 3 }, { channelId: 9 }, { channelId: 1 }, { channelId: 2 }];
    expect(inBuildingOrder(rows, [2, 1, 3]).map((r) => r.channelId)).toEqual([2, 1, 3, 9]);
  });

  it("a room moves one place up or down, not past either end", () => {
    expect(moved([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
    expect(moved([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
    expect(moved([1, 2, 3], 1, -1)).toEqual([1, 2, 3]);
    expect(moved([1, 2, 3], 3, 1)).toEqual([1, 2, 3]);
    expect(moved([1, 2, 3], 7, 1)).toEqual([1, 2, 3]);
  });

  it("positions become 0, 1, 2, ...; only rooms whose position changes are sent", () => {
    const channels = [{ id: 1, position: 0 }, { id: 2, position: 0 }, { id: 3, position: 0 }];
    expect(positionChanges([2, 1, 3], channels)).toEqual([{ channelId: 1, position: 1 }, { channelId: 3, position: 2 }]);
    expect(positionChanges([1, 2], [{ id: 1, position: 0 }, { id: 2, position: 1 }])).toEqual([]);
  });

  it("a name must not be empty or used by another room on the floor", () => {
    const channels = [{ id: 1, parent: 0, name: "Dev" }, { id: 2, parent: 1, name: "Kitchen" }, { id: 3, parent: 4, name: "Lab" }];
    expect(nameProblem(" ", 1, channels)).toBe("empty");
    expect(nameProblem("kitchen ", 1, channels)).toBe("taken");
    expect(nameProblem("Kitchen", 1, channels, 2)).toBeNull(); // its own name
    expect(nameProblem("Lab", 1, channels)).toBeNull(); // on another floor
  });
});

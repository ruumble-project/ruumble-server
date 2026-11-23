// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { Snapshot } from "@ruumble/protocol";
import sample from "@ruumble/protocol/fixtures/sample.json";
import { buildBuilding, homeFloor, isOldLobby, stops } from "../src/lib/model/building.ts";
import { cafeRect, CAFE_VIEW, CAFE_WIDTH, fraction, glow, returnChannelOf, SEATS, seating } from "../src/lib/model/cafeteria.ts";

const snapshot = (inRoot: string[] = [], self?: string): Snapshot => {
  const snap = structuredClone(sample) as unknown as Snapshot;
  for (const u of snap.users) if (inRoot.includes(u.name)) u.channel = 0;
  if (self) snap.self = { session: snap.users.find((u) => u.name === self)!.session };
  return snap;
};

describe("the lobby and its cafeteria (#30)", () => {
  it("the root channel is the lobby below the floors; the floors keep their numbers", () => {
    const b = buildBuilding(snapshot(["Felix", "Hanna"]));
    expect(stops(b).map((f) => [f.channelId, f.level, f.name])).toEqual([
      [0, "Lobby", "Cafeteria"], [1, "Ground floor", "Lobby"], [2, "1st floor", "Development"], [8, "2nd floor", "Support"],
    ]);
    expect(b.floors.map((f) => f.channelId)).toEqual([1, 2, 8]); // the floors alone
    const lobby = b.lobby;
    expect(lobby).toMatchObject({ lobby: true, open: true, rooms: [], population: 2, isSelf: false });
    expect(b.cafeteria.users.map((u) => u.name)).toEqual(["Felix", "Hanna"]);
    expect(b.cafeteria).toMatchObject({ locked: false, isSelf: false });
    expect(homeFloor(b)?.name).toBe("Development"); // Anna's floor
  });

  it("the own user in the cafeteria: their place, the lobby as home floor; locked when the root channel is", () => {
    const snap = snapshot(["Anna"]);
    const b = buildBuilding(snap);
    expect(b.self).toEqual({ kind: "entrance" });
    expect(b.cafeteria.isSelf).toBe(true);
    expect(homeFloor(b)?.lobby).toBe(true);
    const unpaired = snapshot();
    unpaired.self = null;
    expect(homeFloor(buildBuilding(unpaired))?.name).toBe("Lobby"); // the ground floor, not the cafeteria
    expect(buildBuilding(snapshot()).cafeteria.locked).toBe(false);
    const locked = snapshot();
    locked.canEnter = { 0: false };
    expect(buildBuilding(locked).cafeteria.locked).toBe(true);
  });

  it("its place: top right, always the same size, so the door keeps its distance to the right edge", () => {
    const h = (CAFE_WIDTH * CAFE_VIEW.height) / CAFE_VIEW.width;
    expect(cafeRect(1400, 800)).toEqual({ x: 1400 - CAFE_WIDTH, y: 0, width: CAFE_WIDTH, height: h });
    expect(cafeRect(2400, 1200)).toEqual({ x: 2400 - CAFE_WIDTH, y: 0, width: CAFE_WIDTH, height: h });
    // only a smaller floor plan shrinks it, evenly
    const low = cafeRect(1400, 256);
    expect(low.width).toBeCloseTo(396);
    expect(low.height).toBeCloseTo(256);
    expect(cafeRect(700, 800).width).toBe(700);
    expect(cafeRect(0, 0).width).toBe(0);
    expect(fraction({ x: CAFE_VIEW.x, y: CAFE_VIEW.y })).toEqual({ fx: 0, fy: 0 });
  });

  it("seats: one per person in the order they came, no two on the same seat, then standing", () => {
    expect(SEATS).toHaveLength(17);
    expect(new Set(SEATS.map((s) => `${s.x},${s.y}`)).size).toBe(17);
    // neighbours do not overlap: every two seats are at least an avatar (26 units) apart
    for (const a of SEATS) for (const b of SEATS) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(26);
    const people = Array.from({ length: 31 }, (_, i) => ({ session: 100 - i }));
    const placed = seating(people);
    expect(placed[0]).toMatchObject({ user: { session: 70 }, seated: true, at: SEATS[0] });
    expect(placed.filter((p) => p.seated)).toHaveLength(17);
    expect(placed[17]!.seated).toBe(false);
    expect(placed[30]!.at).toEqual(placed[29]!.at); // beyond the standing places they share the last one
  });

  it("the light: none, soft, clear, full", () => {
    expect([0, 1, 2, 3, 5, 6, 20].map(glow)).toEqual([0, 0.5, 0.5, 0.8, 0.8, 1, 1]);
  });

  it("the way back: the room one came from into the cafeteria, kept while there, forgotten outside", () => {
    const inRoom = snapshot();
    const inCafe = snapshot(["Anna"]);
    expect(returnChannelOf(inRoom, inCafe, null)).toBe(3); // from "Let's talk"
    expect(returnChannelOf(inCafe, inCafe, 3)).toBe(3); // still there
    expect(returnChannelOf(inCafe, inRoom, 3)).toBeNull(); // left again
    expect(returnChannelOf(null, inCafe, null)).toBeNull(); // started in the cafeteria
    const gone = snapshot(["Anna"]);
    gone.channels = gone.channels.filter((c) => c.id !== 3);
    expect(returnChannelOf(inCafe, gone, 3)).toBeNull(); // the room is gone
  });

  it("the old empty lobby floor is replaced by the lobby; the floors keep their numbers", () => {
    const snap = snapshot();
    for (const u of snap.users) if (u.channel === 1) u.channel = 0; // Felix and Eva leave the old lobby for the root channel
    const b = buildBuilding(snap);
    expect(b.floors.map((f) => [f.channelId, f.level, f.name])).toEqual([[2, "1st floor", "Development"], [8, "2nd floor", "Support"]]);
    expect(stops(b).map((f) => f.name)).toEqual(["Cafeteria", "Development", "Support"]);
    expect(b.cafeteria.users.map((u) => u.name).sort()).toEqual(["Eva", "Felix"]);
  });

  it("someone in the old lobby: it stays, nobody is lost; a lobby with rooms or another name stays too", () => {
    expect(buildBuilding(snapshot()).floors.map((f) => f.name)).toEqual(["Lobby", "Development", "Support"]);
    const named = snapshot();
    for (const u of named.users) if (u.channel === 1) u.channel = 0;
    named.channels.find((c) => c.id === 1)!.name = "Open Space";
    expect(buildBuilding(named).floors.map((f) => f.name)).toEqual(["Open Space", "Development", "Support"]);
    const withRoom = snapshot();
    for (const u of withRoom.users) if (u.channel === 1) u.channel = 0;
    withRoom.channels.push({ id: 30, parent: 1, name: "Room", position: 0, links: [], temporary: false });
    expect(buildBuilding(withRoom).floors.map((f) => f.name)).toEqual(["Lobby", "Development", "Support"]);
    expect(isOldLobby({ open: true, population: 0, name: " Foyer " })).toBe(true);
    expect(isOldLobby({ open: false, population: 0, name: "Lobby" })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import type { Channel, Snapshot, User } from "@ruumble/protocol";
import { buildBuilding } from "../src/lib/model/building.ts";
import { clampVolume, LISTEN_VOLUME, listenBlock, listenedRooms, listeningToEnd, ownFloorId, pausedListening } from "../src/lib/model/listening.ts";

const ch = (id: number, parent: number | null, name: string, position = 0): Channel => ({ id, parent, name, position, links: [], temporary: false });
const user = (session: number, channel: number): User => ({
  session, name: `U${session}`, channel, selfMute: false, selfDeaf: false, mute: false, deaf: false, suppress: false,
  userId: null, avatar: null, idleMinutes: 0, recording: false,
});
// floor 1 with rooms 11 (Office), 12 (Closed), 13 (No ears), 14 (Talk); floor 2 with room 21
const channels = [
  ch(0, null, "Root"), ch(1, 0, "1F", 0), ch(11, 1, "Office", 0), ch(12, 1, "Closed", 1), ch(13, 1, "No ears", 2), ch(14, 1, "Talk", 3),
  ch(2, 0, "2F", 1), ch(21, 2, "Up", 0),
];
const building = (selfChannel: number | null, extra: Partial<Snapshot> = {}) =>
  buildBuilding({
    v: 1, type: "snapshot", server: { name: "HQ", version: "1.6.870" }, self: selfChannel === null ? null : { session: 1 }, channels,
    users: selfChannel === null ? [] : [user(1, selfChannel)], listeners: {}, canEnter: { "12": false }, canListen: { "13": false }, ...extra,
  });
const room = (b: ReturnType<typeof building>, id: number) => {
  const floor = b.floors.find((f) => f.rooms.some((r) => r.channelId === id))!;
  return { floor, room: floor.rooms.find((r) => r.channelId === id)! };
};

describe("Listening in (#19)", () => {
  it("the own floor: from a room, the corridor or an open floor; none in the entrance or unpaired", () => {
    expect(ownFloorId(building(11))).toBe(1);
    expect(ownFloorId(building(1))).toBe(1);
    expect(ownFloorId(building(0))).toBeNull();
    expect(ownFloorId(building(null))).toBeNull();
  });

  it("rooms on the own floor only, never the own room, a closed room or one without the Listen permission", () => {
    const b = building(11);
    const block = (id: number) => { const { floor, room: r } = room(b, id); return listenBlock(b, floor, r); };
    expect(block(14)).toBeNull();
    expect(block(11)).toBe("own-room");
    expect(block(12)).toBe("closed");
    expect(block(13)).toBe("no-permission");
    expect(block(21)).toBe("other-floor");
  });

  it("the room carries the Listen permission and whether the own user listens there (older services: allowed)", () => {
    const b = building(11, { listeners: { "14": [1, 5], "21": [5] }, canListen: undefined });
    expect(room(b, 14).room).toMatchObject({ selfListening: true, canListen: true });
    expect(room(b, 21).room.selfListening).toBe(false);
    expect(room(b, 13).room.canListen).toBe(true);
    expect(room(buildBuilding({ ...{ v: 1, type: "snapshot", server: { name: "HQ", version: "1" }, self: null, channels, users: [], listeners: { "14": [1] }, canEnter: {} } } as Snapshot), 14).room.selfListening).toBe(false);
  });

  it("ends what breaks a rule: other floors, the own room, closed rooms, the corridor and unknown channels", () => {
    expect(listeningToEnd(building(11), [14, 11, 12, 13, 21, 1, 99])).toEqual([11, 12, 13, 21, 1, 99]);
    // changing the floor ends everything on the old one
    expect(listeningToEnd(building(21), [14])).toEqual([14]);
    // the entrance has no floor: everything ends
    expect(listeningToEnd(building(0), [14, 21])).toEqual([14, 21]);
    // a hidden channel neither
    expect(listeningToEnd(buildBuilding({
      v: 1, type: "snapshot", server: { name: "HQ", version: "1" }, self: { session: 1 },
      channels: [...channels, ch(15, 11, "Too deep")], users: [user(1, 15)], listeners: {}, canEnter: {},
    }), [14])).toEqual([14]);
  });

  it("a room paused while the own user is inside resumes once they leave it on the same floor (#22)", () => {
    // still inside: stays paused
    expect(pausedListening(building(14), [14])).toEqual({ resume: [], forget: [] });
    // left for another room or the corridor of the floor: listening starts again
    expect(pausedListening(building(11), [14])).toEqual({ resume: [14], forget: [] });
    expect(pausedListening(building(1), [14])).toEqual({ resume: [14], forget: [] });
    // another floor, the entrance, a room that can no longer be listened to: forgotten
    expect(pausedListening(building(21), [14])).toEqual({ resume: [], forget: [14] });
    expect(pausedListening(building(0), [14])).toEqual({ resume: [], forget: [14] });
    expect(pausedListening(building(11), [12, 13, 99])).toEqual({ resume: [], forget: [12, 13, 99] });
    // own place unknown: nothing decided yet
    expect(pausedListening(building(null), [14])).toEqual({ resume: [], forget: [] });
  });

  it("nothing ends while the own place is unknown", () => {
    expect(listeningToEnd(building(null), [14, 21])).toEqual([]);
  });

  it("clampVolume: within the slider's range in whole dB, the start value for anything else", () => {
    expect(LISTEN_VOLUME.start).toBe(-15);
    expect([-40, -30, -14.6, 0, 12, 20].map(clampVolume)).toEqual([-30, -30, -15, 0, 12, 12]);
    expect([Number.NaN, "3", undefined].map(clampVolume)).toEqual([-15, -15, -15]);
  });

  it("listenedRooms: the rooms in floor-plan order", () => {
    expect(listenedRooms(building(11), [21, 14, 99]).map((r) => r.name)).toEqual(["Talk", "Up"]);
  });
});

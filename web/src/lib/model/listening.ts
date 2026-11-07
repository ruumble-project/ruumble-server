/**
 * Listening in on another room (#19, ADR-0027): which rooms the own user may listen to and which listening has to
 * end. Pure functions over the building (docs/internal/charter.md, 3.4).
 *
 * Rules: only rooms (not the corridor or an open floor), only on the floor the user is in, never the own room, never a
 * closed room (no Enter permission, stricter than Mumble) and never without Mumble's Listen permission. Listening
 * that breaks a rule ends, wherever it came from (a floor change, Mumble restoring it on connect, Mumble's own menu).
 */
import type { Building, Floor, Room } from "./building.ts";

/** why a room cannot be listened to; null: it can */
export type ListenBlock = "own-room" | "closed" | "no-permission" | "other-floor";

/** the volume slider in dB: very discreet at the start, Mumble keeps the value per room afterwards */
export const LISTEN_VOLUME = { min: -30, max: 12, start: -15, step: 1 } as const;

/** the floor the own user is in; null in the entrance, a hidden channel, or without an own user */
export function ownFloorId(building: Building): number | null {
  const self = building.self;
  return self && (self.kind === "room" || self.kind === "corridor" || self.kind === "open-floor") ? self.floorId : null;
}

/** whether the own user may listen to `room` on `floor`; null when allowed */
export function listenBlock(building: Building, floor: Floor, room: Room): ListenBlock | null {
  if (ownFloorId(building) !== floor.channelId) return "other-floor";
  if (room.isSelf) return "own-room";
  if (room.locked) return "closed";
  if (!room.canListen) return "no-permission";
  return null;
}

/**
 * The channels in `listening` the own user has to stop listening to. Nothing while the own place is unknown (no
 * paired plugin yet): the rules need it.
 */
export function listeningToEnd(building: Building, listening: readonly number[]): number[] {
  if (!building.self) return [];
  const floorId = ownFloorId(building);
  const floor = building.floors.find((f) => f.channelId === floorId);
  return listening.filter((channel) => {
    const room = floor?.rooms.find((r) => r.channelId === channel);
    return !floor || !room || listenBlock(building, floor, room) !== null;
  });
}

/** a volume in dB as the slider shows it: within its range, whole steps; anything else is the start value */
export function clampVolume(db: unknown): number {
  if (typeof db !== "number" || !Number.isFinite(db)) return LISTEN_VOLUME.start;
  return Math.min(LISTEN_VOLUME.max, Math.max(LISTEN_VOLUME.min, Math.round(db / LISTEN_VOLUME.step) * LISTEN_VOLUME.step));
}

/** the rooms the own user listens to, in floor-plan order, with their names (for the list in the top bar) */
export function listenedRooms(building: Building, listening: readonly number[]): Room[] {
  const set = new Set(listening);
  return building.floors.flatMap((f) => f.rooms).filter((r) => set.has(r.channelId));
}

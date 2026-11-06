/**
 * The rooms of a floor in the floor care (client#12): order, a new room's name. Pure functions; the changes go
 * through Ruumble Client's `desk` to Mumble, the building shows them with the next snapshot (ADR-0003).
 */
import type { Channel } from "@ruumble/protocol";

/** the floor care's rows in the order of the floor plan; rooms the building does not show (yet) come last */
export function inBuildingOrder<T extends { channelId: number }>(rows: readonly T[], order: readonly number[]): T[] {
  const at = new Map(order.map((id, i) => [id, i]));
  return [...rows].sort((a, b) => (at.get(a.channelId) ?? Infinity) - (at.get(b.channelId) ?? Infinity));
}

/** the order after moving one room a place up (-1) or down (+1); unchanged at either end */
export function moved(order: readonly number[], id: number, step: -1 | 1): number[] {
  const i = order.indexOf(id);
  const j = i + step;
  if (i < 0 || j < 0 || j >= order.length) return [...order];
  const next = [...order];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

/**
 * Mumble's positions for an order: 0, 1, 2, ... Positions are often all equal (then the name decides), so every room
 * whose position is not already its place gets one; the result lists only those.
 */
export function positionChanges(order: readonly number[], channels: readonly Pick<Channel, "id" | "position">[]): { channelId: number; position: number }[] {
  const now = new Map(channels.map((c) => [c.id, c.position]));
  return order.flatMap((id, position) => (now.get(id) === position ? [] : [{ channelId: id, position }]));
}

export type NameProblem = "empty" | "taken";

/** a room's name on its floor: not empty and not used by another room there (Mumble refuses the same name twice) */
export function nameProblem(name: string, parentId: number, channels: readonly Pick<Channel, "id" | "parent" | "name">[], self?: number): NameProblem | null {
  const n = name.trim().toLowerCase();
  if (!n) return "empty";
  return channels.some((c) => c.parent === parentId && c.id !== self && c.name.trim().toLowerCase() === n) ? "taken" : null;
}

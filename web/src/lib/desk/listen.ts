/**
 * Ruumble Client (#19): listening in, as the client's `desk` object reports it. Pure parsing of what the client hands
 * over; anything malformed is dropped.
 */

/** a room the own user listens to, with its volume in dB as Mumble keeps it */
export interface Listened {
  channel: number;
  volume: number;
}

/** why the server refused: Mumble's Listen permission, or one of its listener limits */
export type ListenRefusal = "permission" | "channel-limit" | "user-limit" | "other";

export function parseListening(raw: unknown): Listened[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const result: Listened[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { channel, volume } = entry as Record<string, unknown>;
    if (typeof channel !== "number" || !Number.isInteger(channel) || seen.has(channel)) continue;
    seen.add(channel);
    result.push({ channel, volume: typeof volume === "number" && Number.isFinite(volume) ? volume : 0 });
  }
  return result;
}

export function parseRefusal(raw: unknown): ListenRefusal {
  return raw === "permission" || raw === "channel-limit" || raw === "user-limit" ? raw : "other";
}

/**
 * Ruumble Client (ADR-0024): the Mumble log and channel chat when the web UI runs inside the Ruumble Client.
 * Pure functions over the entries the client hands over (plain text, never Mumble's HTML).
 */

export type DeskKind = "text" | "private" | "own" | "warning" | "info";

export interface DeskEntry {
  id: number;
  /** ms since epoch */
  time: number;
  kind: DeskKind;
  text: string;
}

/** how many entries the panel keeps (the client keeps 500 as well) */
export const DESK_MAX_ENTRIES = 500;

const KINDS: readonly DeskKind[] = ["text", "private", "own", "warning", "info"];

/** an entry from the client, or null for anything malformed */
export function parseEntry(raw: unknown): DeskEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const { id, time, kind, text } = raw as Record<string, unknown>;
  if (typeof id !== "number" || typeof time !== "number" || typeof text !== "string") return null;
  return { id, time, text, kind: KINDS.includes(kind as DeskKind) ? (kind as DeskKind) : "info" };
}

/** entries in order of their id, without duplicates (history and live entries may overlap), at most `max` */
export function mergeEntries(current: readonly DeskEntry[], incoming: readonly DeskEntry[], max = DESK_MAX_ENTRIES): DeskEntry[] {
  const byId = new Map<number, DeskEntry>();
  for (const e of current) byId.set(e.id, e);
  for (const e of incoming) byId.set(e.id, e);
  const all = [...byId.values()].sort((a, b) => a.id - b.id);
  return all.length > max ? all.slice(all.length - max) : all;
}

/** messages from others newer than the last one seen: what the button counts */
export function unreadCount(entries: readonly DeskEntry[], seenId: number): number {
  return entries.filter((e) => e.id > seenId && (e.kind === "text" || e.kind === "private")).length;
}

/** "09:41" in the viewer's time */
export function timeOf(time: number, locale: string): string {
  return new Date(time).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/** the text of a chat message ready to send: trimmed, empty means nothing to send */
export function outgoing(draft: string): string {
  return draft.trim();
}

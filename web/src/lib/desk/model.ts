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

/** a message from someone else after the last one seen: what the button counts and the "New" line marks */
const unseen = (e: DeskEntry, seenId: number) => e.id > seenId && (e.kind === "text" || e.kind === "private");

export function unreadCount(entries: readonly DeskEntry[], seenId: number): number {
  return entries.filter((e) => unseen(e, seenId)).length;
}

/** what the box shows: everything, only chat messages, or only Mumble's notices */
export type DeskFilter = "all" | "messages" | "notices";

export const DESK_FILTERS: readonly DeskFilter[] = ["all", "messages", "notices"];

const MESSAGE_KINDS: ReadonlySet<DeskKind> = new Set(["text", "private", "own"]);

/** a remembered filter, or "all" for anything else */
export function parseFilter(raw: unknown): DeskFilter {
  return DESK_FILTERS.includes(raw as DeskFilter) ? (raw as DeskFilter) : "all";
}

/** the entries that match the filter and contain the search text anywhere, ignoring case */
export function visibleEntries(entries: readonly DeskEntry[], query: string, filter: DeskFilter): readonly DeskEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle && filter === "all") return entries;
  return entries.filter((e) => {
    if (filter !== "all" && MESSAGE_KINDS.has(e.kind) !== (filter === "messages")) return false;
    return !needle || e.text.toLocaleLowerCase().includes(needle);
  });
}

/** where the "New" line goes: the first message from others after the last one seen, or null when there is none */
export function firstUnreadId(entries: readonly DeskEntry[], seenId: number): number | null {
  return entries.find((e) => unseen(e, seenId))?.id ?? null;
}

/** one formatter per language: a new one for each of up to 500 lines costs more than the formatting */
const clocks = new Map<string, Intl.DateTimeFormat>();

/** "09:41" in the viewer's time */
export function timeOf(time: number, locale: string): string {
  let clock = clocks.get(locale);
  if (!clock) clocks.set(locale, (clock = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" })));
  return clock.format(time);
}

/** the text of a chat message ready to send: trimmed, empty means nothing to send */
export function outgoing(draft: string): string {
  return draft.trim();
}

/**
 * The task board in the web UI (#29), as pure functions: what the graphic in the door strip shows, the marks at the
 * avatars, the lanes of the sidebar, which buttons a person gets (the same rules as the service) and the text of the
 * plaque on the room.
 */
import { EQUIPMENT_DEFAULTS, TASK_NEW_MS, THANKS_MOTIFS, applyTaskAction, type Equipment, type Snapshot, type TaskAction, type TaskBoardSummary, type TaskEvent, type TaskPerson, type TaskRequest, type ThanksMotif } from "@ruumble/protocol";
import { relativeTime } from "../board/model.ts";
import { t } from "../i18n/index.svelte.ts";

/** what the graphic shows: nothing open, open requests (flag up), waiting long (the flag waves), only being helped */
export type BoardLook = "empty" | "open" | "waiting" | "helping";

export function equipmentOf(snapshot: Pick<Snapshot, "equipment"> | null, channelId: number): Equipment {
  return snapshot?.equipment?.[String(channelId)] ?? EQUIPMENT_DEFAULTS;
}

export function boardLook(summary: TaskBoardSummary, waveMinutes: number, now: number): BoardLook {
  if (summary.open > 0) return summary.oldest !== null && now - summary.oldest >= waveMinutes * 60_000 ? "waiting" : "open";
  return summary.helping.length ? "helping" : "empty";
}

/** the flag is red while the newest open request is new (2 hours), then green */
export function flagIsNew(summary: TaskBoardSummary, now: number): boolean {
  return summary.newest !== null && now - summary.newest < TASK_NEW_MS;
}

/** the tooltip of the graphic: the room, what waits there and since when */
export function boardLabel(room: string, summary: TaskBoardSummary, now: number): string {
  const tb = t().taskboard;
  const state = summary.open > 0 ? `${tb.waiting(summary.open)}${summary.oldest !== null ? `, ${tb.oldest(relativeTime(summary.oldest, now))}` : ""}` : tb.nothingOpen;
  return `${tb.open(room)} · ${state}`;
}

/** "Anna", "Anna and Ben", "Anna, Ben and Cleo" */
export function names(list: readonly string[]): string {
  return list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} ${t().taskboard.and} ${list.at(-1)}`;
}

/** the three lanes: waiting longest first, being helped and done newest first */
export function lanes(requests: readonly TaskRequest[]): { open: TaskRequest[]; helping: TaskRequest[]; done: TaskRequest[] } {
  const by = (key: (r: TaskRequest) => number, dir: 1 | -1) => (a: TaskRequest, b: TaskRequest) => dir * (key(a) - key(b));
  return {
    open: requests.filter((r) => r.state === "open").sort(by((r) => r.createdAt, 1)),
    helping: requests.filter((r) => r.state === "helping").sort(by((r) => r.changedAt, -1)),
    done: requests.filter((r) => r.state === "done").sort(by((r) => r.doneAt ?? r.changedAt, -1)),
  };
}

/** may `me` do this now: the same rules as the service */
export function may(request: TaskRequest, action: TaskAction, me: TaskPerson | null): boolean {
  return !!me && typeof applyTaskAction(request, action, me, 0) !== "string";
}

/** the asker may still thank: done with a helper, no card yet */
export function mayThank(request: TaskRequest, me: TaskPerson | null): boolean {
  return !!me && request.asker.person === me.person && request.state === "done" && !!request.helper && !request.thanks;
}

/** the text of the plaque on the room's outer wall */
export function noticeText(e: TaskEvent): string {
  const n = t().taskboard.notice;
  const helper = e.helper?.name ?? "";
  switch (e.kind) {
    case "asked": return e.target ? n.askedTarget(e.by.name, e.target.name, e.text) : n.asked(e.by.name, e.text);
    case "plus": return n.plus(e.by.name, e.affected);
    case "taken": return n.taken(helper, e.asker.name);
    case "back": return n.back(e.asker.name);
    case "done": return n.done(helper, e.asker.name);
    case "solved": return n.solved(e.asker.name);
    case "reopened": return n.reopened(e.by.name, e.text);
    case "thanks": return n.thanks(e.asker.name, helper);
  }
}

/** the colour of the plaque: orange while someone waits, blue when helped, green when done */
export function noticeTone(kind: TaskEvent["kind"]): "signal" | "help" | "done" {
  return kind === "taken" ? "help" : kind === "done" || kind === "solved" || kind === "thanks" ? "done" : "signal";
}

/** a suggestion for the thank-you card that is not `current` (the dice) */
export function suggestThanks(motif: ThanksMotif, current: string, pick: (n: number) => number = (n) => Math.floor(Math.random() * n)): string {
  const list = t().taskboard.thanks.suggestions[motif];
  const others = list.filter((s) => s !== current);
  return others[pick(others.length)] ?? list[0]!;
}

export const MOTIFS = THANKS_MOTIFS;

/** the people an @ can name: everyone else who uses Ruumble, those in the room first, then by name */
export function mentionable(snapshot: Snapshot | null, channelId: number, query: string): { person: string; name: string; here: boolean }[] {
  if (!snapshot) return [];
  const self = snapshot.self?.session;
  const q = query.trim().toLowerCase();
  return snapshot.users
    .filter((u) => u.person && u.session !== self && u.name.toLowerCase().includes(q))
    .map((u) => ({ person: u.person!, name: u.name, here: u.channel === channelId }))
    .sort((a, b) => Number(b.here) - Number(a.here) || a.name.localeCompare(b.name))
    .slice(0, 6);
}

/** the @word being typed at the end of the text, or null */
export function mentionQuery(text: string): string | null {
  const m = /(?:^|\s)@([^\s@]*)$/.exec(text);
  return m ? m[1]! : null;
}

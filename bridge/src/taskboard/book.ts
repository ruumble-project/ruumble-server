/**
 * The task board's requests (#29), kept by the service in `taskboard.json`.
 *
 * Rules (applyTaskAction() in protocol, shared with the web UI): only someone in the room asks (checked by the routes); everyone who may enter can +1 and take a
 * request on, one helper at a time; helper or asker put it back or mark it done; the asker marks it solved; everyone
 * involved (asker, helper, +1) reopens a done request; the asker thanks the helper once it is done.
 * Done requests are cleared after the channel's `clearDays` (prune()).
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { TASK_LIMITS, TaskRequest, applyTaskAction, summarizeTasks, type NewTaskRequest, type TaskAction, type TaskBoardSummary, type TaskEventKind, type TaskPerson, type TaskRefusal, type ThanksMotif } from "@ruumble/protocol";

/** a helper who left: the asker is asked whether it is done after this long */
export const FORGOTTEN_AFTER_MS = 60 * 60_000;

interface Stored extends TaskRequest {
  /** the asker was asked whether a forgotten request is done */
  reminded?: boolean;
}

export interface TaskBookOptions {
  now?: () => number;
  /** a request changed: snapshots (summaries) go out again */
  onChange?: () => void;
}

export class TaskBook {
  private requests: Stored[] = [];
  private readonly file: string | null;
  private readonly now: () => number;
  private readonly onChange: () => void;

  /** `file` null: in memory only (tests) */
  constructor(file: string | null, o: TaskBookOptions = {}) {
    this.file = file;
    this.now = o.now ?? Date.now;
    this.onChange = o.onChange ?? (() => {});
    if (!file) return;
    try {
      const raw = JSON.parse(readFileSync(file, "utf8")) as unknown[];
      for (const item of raw) {
        const parsed = TaskRequest.safeParse(item);
        if (parsed.success) this.requests.push({ ...parsed.data, reminded: (item as Stored).reminded === true || undefined });
      }
    } catch {
      this.requests = [];
    }
  }

  /** the requests of a channel as the web UI sees them: newest first */
  list(channelId: number): TaskRequest[] {
    return this.requests.filter((r) => r.channelId === channelId).sort((a, b) => b.createdAt - a.createdAt).map(view);
  }

  get(id: string): TaskRequest | null {
    const r = this.requests.find((x) => x.id === id);
    return r ? view(r) : null;
  }

  count(channelId: number): number {
    return this.requests.filter((r) => r.channelId === channelId).length;
  }

  summary(channelId: number): TaskBoardSummary {
    return summarizeTasks(this.requests.filter((r) => r.channelId === channelId));
  }

  /** a new request; "invalid" when the board already holds too many open ones */
  ask(channelId: number, asker: TaskPerson, input: Omit<NewTaskRequest, "target">, target?: TaskPerson): TaskRequest | "invalid" {
    if (this.requests.filter((r) => r.channelId === channelId && r.state !== "done").length >= TASK_LIMITS.openPerBoard) return "invalid";
    const now = this.now();
    const request: Stored = {
      id: randomUUID(),
      channelId,
      text: oneLine(input.text).slice(0, TASK_LIMITS.textChars),
      ...(input.until ? { until: input.until } : {}),
      ...(input.talk ? { talk: true } : {}),
      ...(input.look ? { look: true } : {}),
      asker,
      ...(target ? { target } : {}),
      plus: [],
      state: "open",
      createdAt: now,
      changedAt: now,
    };
    this.requests.push(request);
    this.changed();
    return view(request);
  }

  act(id: string, action: TaskAction, actor: TaskPerson): { request: TaskRequest; kind: TaskEventKind | null } | TaskRefusal {
    const i = this.requests.findIndex((r) => r.id === id);
    if (i < 0) return "not-found";
    const result = applyTaskAction(view(this.requests[i]!), action, actor, this.now());
    if (typeof result === "string") return result;
    this.requests[i] = result.request;
    this.changed();
    return result;
  }

  /** the asker's thank-you card to the helper, once the request is done */
  thank(id: string, actor: TaskPerson, motif: ThanksMotif, text: string): TaskRequest | TaskRefusal {
    const r = this.requests.find((x) => x.id === id);
    if (!r) return "not-found";
    if (r.asker.person !== actor.person) return "forbidden";
    if (r.state !== "done" || !r.helper) return "invalid";
    r.thanks = { motif, text: oneLine(text).slice(0, TASK_LIMITS.thanksChars), at: this.now() };
    this.changed();
    return view(r);
  }

  /** remove done requests older than their channel's `clearDays`; returns how many */
  prune(clearDaysOf: (channelId: number) => number): number {
    const now = this.now();
    const before = this.requests.length;
    this.requests = this.requests.filter((r) => r.state !== "done" || now - (r.doneAt ?? r.changedAt) < clearDaysOf(r.channelId) * 24 * 60 * 60_000);
    const removed = before - this.requests.length;
    if (removed) this.changed();
    return removed;
  }

  /** every request of a channel (room care); returns how many */
  clear(channelId: number): number {
    const before = this.requests.length;
    this.requests = this.requests.filter((r) => r.channelId !== channelId);
    const removed = before - this.requests.length;
    if (removed) this.changed();
    return removed;
  }

  /**
   * Requests being helped for FORGOTTEN_AFTER_MS whose helper is no longer around: each is returned once, so the asker
   * can be asked whether it is done
   */
  forgotten(isAround: (person: string) => boolean): TaskRequest[] {
    const limit = this.now() - FORGOTTEN_AFTER_MS;
    const found = this.requests.filter((r) => r.state === "helping" && !r.reminded && r.changedAt <= limit && r.helper && !isAround(r.helper.person));
    for (const r of found) r.reminded = true;
    if (found.length) this.save();
    return found.map(view);
  }

  private changed(): void {
    this.save();
    this.onChange();
  }

  private save(): void {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.requests, null, 2), { mode: 0o600 });
    renameSync(tmp, this.file);
  }
}

/** without the service's own bookkeeping */
function view(r: Stored): TaskRequest {
  const { reminded: _reminded, ...rest } = r;
  return { ...rest, plus: [...rest.plus] };
}

/** one line, single spaces */
export function oneLine(text: string): string {
  return text.replace(/[\u0000-\u001f\u007f\s]+/g, " ").trim();
}

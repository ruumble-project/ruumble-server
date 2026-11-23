/**
 * Room equipment and the task board (#29).
 *
 * Equipment: what a room or corridor has besides its people, kept by the service per channel (REST under
 * /api/equipment). The board is always there; the binders (the Mumble description) can be switched off; the task board
 * can be switched on.
 *
 * Task board: someone in the room asks for help in one line; everyone who may enter the room sees it, can say "me
 * too" (+1) and take it on. One helper per request. Asker and helper close it, the asker may thank the helper with a
 * card. REST under /api/taskboard, events on /ws/ui (`taskboard`), a summary per channel in the snapshot.
 */
import { z } from "zod";

const channelId = z.number().int().min(0);
const personId = z.string().regex(/^[0-9a-f]{16}$/);
const count = z.number().int().min(0);
const time = z.number().int();

// ---------------------------------------------------------------- Equipment

/** "the flag waves when a request waits for" (minutes) */
export const WAVE_MINUTES = [15, 30, 60, 120, 240] as const;
/** "done requests are cleared after" (days) */
export const CLEAR_DAYS = [1, 3, 7, 14, 30] as const;

export const Equipment = z.object({
  /** the binders with the Mumble description; off: hidden even when there is a description */
  binders: z.boolean(),
  taskboard: z.boolean(),
  waveMinutes: z.union(WAVE_MINUTES.map((m) => z.literal(m))),
  clearDays: z.union(CLEAR_DAYS.map((d) => z.literal(d))),
});
export type Equipment = z.infer<typeof Equipment>;

/** a channel nobody has set up: binders on, task board off */
export const EQUIPMENT_DEFAULTS: Equipment = { binders: true, taskboard: false, waveMinutes: 30, clearDays: 7 };

// ---------------------------------------------------------------- Task board

/** a request this young is new: the flag on the task board is red, afterwards green */
export const TASK_NEW_MS = 2 * 60 * 60_000;

export const TASK_LIMITS = { textChars: 280, thanksChars: 140, openPerBoard: 50, perMinute: 30 } as const;

/** the drawn motifs of a thank-you card */
export const THANKS_MOTIFS = ["coffee", "cake", "rocket", "trophy", "flowers", "high-five", "lifebuoy", "star"] as const;
export const ThanksMotif = z.enum(THANKS_MOTIFS);
export type ThanksMotif = z.infer<typeof ThanksMotif>;

/** someone who takes part in a request: their stable name from the snapshot and their name at the time */
export const TaskPerson = z.object({ person: personId, name: z.string() });
export type TaskPerson = z.infer<typeof TaskPerson>;

/** open: needs help; helping: someone took it on; done: helped or solved */
export const TaskState = z.enum(["open", "helping", "done"]);
export type TaskState = z.infer<typeof TaskState>;

/** a time of day "HH:MM", e.g. "until 14:00" */
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const TaskThanks = z.object({ motif: ThanksMotif, text: z.string().max(TASK_LIMITS.thanksChars), at: time });
export type TaskThanks = z.infer<typeof TaskThanks>;

export const TaskRequest = z.object({
  id: z.string().min(1).max(64),
  channelId,
  text: z.string().min(1).max(TASK_LIMITS.textChars),
  /** chips: needed until this time of day, a quick call, someone to have a look */
  until: clock.optional(),
  talk: z.boolean().optional(),
  look: z.boolean().optional(),
  asker: TaskPerson,
  /** a targeted request (@name); everyone else may still help */
  target: TaskPerson.optional(),
  /** while helping and once done (missing when the asker solved it themselves) */
  helper: TaskPerson.optional(),
  /** "me too" */
  plus: z.array(TaskPerson),
  state: TaskState,
  createdAt: time,
  /** last change of the state */
  changedAt: time,
  doneAt: time.optional(),
  /** done by the asker without a helper */
  selfSolved: z.boolean().optional(),
  thanks: TaskThanks.optional(),
});
export type TaskRequest = z.infer<typeof TaskRequest>;

/** GET /api/taskboard/:channelId */
export const TaskBoardView = z.object({ channelId, name: z.string(), equipment: Equipment, requests: z.array(TaskRequest) });
export type TaskBoardView = z.infer<typeof TaskBoardView>;

/** POST /api/taskboard/:channelId */
export const NewTaskRequest = z.object({
  text: z.string().trim().min(1).max(TASK_LIMITS.textChars),
  until: clock.optional(),
  talk: z.boolean().optional(),
  look: z.boolean().optional(),
  target: personId.optional(),
});
export type NewTaskRequest = z.infer<typeof NewTaskRequest>;

/** POST /api/taskboard/requests/:id/:action */
export const TASK_ACTIONS = ["plus", "unplus", "take", "back", "done", "solved", "reopen"] as const;
export const TaskAction = z.enum(TASK_ACTIONS);
export type TaskAction = z.infer<typeof TaskAction>;

/** PUT /api/taskboard/requests/:id/thanks */
export const NewThanks = z.object({ motif: ThanksMotif, text: z.string().trim().max(TASK_LIMITS.thanksChars) });
export type NewThanks = z.infer<typeof NewThanks>;

/** in the snapshot, per channel with a task board the viewer may enter: what the floor plan shows */
export const TaskBoardSummary = z.object({
  /** requests waiting for help (not taken yet) */
  open: count,
  /** creation time of the oldest of them, null without */
  oldest: time.nullable(),
  /** creation time of the newest of them, null without: the flag is red while it is new (TASK_NEW_MS) */
  newest: time.nullable(),
  /** people with a request waiting for help */
  asking: z.array(personId),
  /** people helping right now */
  helping: z.array(personId),
});
export type TaskBoardSummary = z.infer<typeof TaskBoardSummary>;

/** what happened on a task board (WebSocket `taskboard`, the plaque on the room) */
export const TaskEventKind = z.enum(["asked", "plus", "taken", "back", "done", "solved", "reopened", "thanks"]);
export type TaskEventKind = z.infer<typeof TaskEventKind>;

export const TaskEvent = z.object({
  kind: TaskEventKind,
  channelId,
  /** name of the room or floor */
  room: z.string(),
  requestId: z.string().min(1).max(64),
  /** who did it */
  by: TaskPerson,
  text: z.string(),
  asker: TaskPerson,
  target: TaskPerson.optional(),
  helper: TaskPerson.optional(),
  /** people affected after a +1 (asker and +1) */
  affected: count,
  thanks: TaskThanks.optional(),
  at: time,
});
export type TaskEvent = z.infer<typeof TaskEvent>;

// ---------------------------------------------------------------- Rules (service and web UI)

export type TaskRefusal = "not-found" | "forbidden" | "invalid";

/** the event kind of each action */
const KIND: Record<TaskAction, TaskEventKind> = { plus: "plus", unplus: "plus", take: "taken", back: "back", done: "done", solved: "solved", reopen: "reopened" };

export const involvedIn = (r: TaskRequest, person: string) => r.asker.person === person || r.helper?.person === person || r.plus.some((p) => p.person === person);

/**
 * The request after `action` by `actor`, or why not. Pure: the routes check the room, the store keeps the result.
 * `unplus` returns the request unchanged with kind null (no event: taking back a +1 is quiet).
 */
export function applyTaskAction(r: TaskRequest, action: TaskAction, actor: TaskPerson, now: number): { request: TaskRequest; kind: TaskEventKind | null } | TaskRefusal {
  const me = actor.person;
  const isAsker = r.asker.person === me;
  const isHelper = r.helper?.person === me;
  const base = { ...r, plus: [...r.plus] };
  switch (action) {
    case "plus":
      if (r.state === "done" || isAsker || isHelper) return "forbidden";
      if (r.plus.some((p) => p.person === me)) return "invalid";
      return { request: { ...base, plus: [...r.plus, actor] }, kind: KIND.plus };
    case "unplus":
      if (!r.plus.some((p) => p.person === me)) return "invalid";
      return { request: { ...base, plus: r.plus.filter((p) => p.person !== me) }, kind: null };
    case "take":
      if (r.state !== "open") return "invalid";
      if (isAsker) return "forbidden";
      return { request: { ...base, state: "helping", helper: actor, plus: r.plus.filter((p) => p.person !== me), changedAt: now }, kind: KIND.take };
    case "back": {
      if (r.state !== "helping") return "invalid";
      if (!isAsker && !isHelper) return "forbidden";
      const { helper: _helper, ...rest } = base;
      return { request: { ...rest, state: "open", changedAt: now }, kind: KIND.back };
    }
    case "done":
      if (r.state !== "helping") return "invalid";
      if (!isAsker && !isHelper) return "forbidden";
      return { request: { ...base, state: "done", changedAt: now, doneAt: now }, kind: KIND.done };
    case "solved": {
      if (r.state === "done") return "invalid";
      if (!isAsker) return "forbidden";
      const { helper: _helper, ...rest } = base;
      return { request: { ...rest, state: "done", selfSolved: true, changedAt: now, doneAt: now }, kind: KIND.solved };
    }
    case "reopen": {
      if (r.state !== "done") return "invalid";
      if (!involvedIn(r, me)) return "forbidden";
      const { helper: _helper, doneAt: _doneAt, selfSolved: _selfSolved, ...rest } = base;
      return { request: { ...rest, state: "open", changedAt: now }, kind: KIND.reopen };
    }
  }
}

/** what the floor plan shows of a board's requests */
export function summarizeTasks(requests: TaskRequest[]): TaskBoardSummary {
  const open = requests.filter((r) => r.state === "open");
  const unique = (list: string[]) => [...new Set(list)];
  return {
    open: open.length,
    oldest: open.length ? Math.min(...open.map((r) => r.createdAt)) : null,
    newest: open.length ? Math.max(...open.map((r) => r.createdAt)) : null,
    asking: unique(open.map((r) => r.asker.person)),
    helping: unique(requests.filter((r) => r.state === "helping" && r.helper).map((r) => r.helper!.person)),
  };
}

/**
 * Room equipment and the task board in the mock (#29): the same rules as the service (applyTaskAction from protocol),
 * kept in memory. The sample building starts with a few boards and requests, so the floor plan shows every state.
 */
import { EQUIPMENT_DEFAULTS, Equipment, NewTaskRequest, NewThanks, TaskAction, applyTaskAction, summarizeTasks, type Snapshot, type TaskBoardSummary, type TaskEvent, type TaskEventKind, type TaskPerson, type TaskRequest } from "@ruumble/protocol";
import type { BoardResult, EquipmentApi, TaskBoardApi } from "./types.ts";

const MINUTE = 60_000;

type Refusal = "not-in-room" | "invalid" | "forbidden" | "not-found";

export interface MockTaskHost {
  state(): Snapshot;
  /** the own user as a task person, null without a connected plugin */
  me(): (TaskPerson & { channel: number }) | null;
  personOf(name: string): string;
  emit(): void;
  event(event: TaskEvent): void;
}

export class MockTasks {
  private equipmentOf = new Map<number, Equipment>();
  private requests: TaskRequest[] = [];
  private seq = 1;

  constructor(private readonly host: MockTaskHost) {}

  /** the sample building: boards in "Let's talk", "Ben's office", "Retrospective" and the corridor of Development */
  seed(now: number): void {
    const st = this.host.state();
    const named = (name: string) => st.channels.find((c) => c.name === name)?.id;
    const person = (name: string): TaskPerson => ({ person: this.host.personOf(name), name });
    const board = { ...EQUIPMENT_DEFAULTS, taskboard: true };
    for (const name of ["Let's talk", "Ben's office", "Retrospective", "Development"]) {
      const id = named(name);
      if (id !== undefined) this.equipmentOf.set(id, board);
    }
    const talk = named("Let's talk"), office = named("Ben's office"), retro = named("Retrospective");
    if (talk === undefined || office === undefined || retro === undefined) return;
    const add = (r: Omit<TaskRequest, "id">) => this.requests.push({ id: `mock-task-${this.seq++}`, ...r });
    add({ channelId: talk, text: "VPN certificate expired, how do I renew it?", asker: person("Clara"), helper: person("Ben"), plus: [], state: "helping", createdAt: now - 40 * MINUTE, changedAt: now - 10 * MINUTE, talk: true });
    add({ channelId: talk, text: "Export the icons for the release", asker: person("David"), helper: person("Clara"), plus: [], state: "done", createdAt: now - 26 * 60 * MINUTE, changedAt: now - 20 * 60 * MINUTE, doneAt: now - 20 * 60 * MINUTE, thanks: { motif: "coffee", text: "Coffee is on me!", at: now - 20 * 60 * MINUTE } });
    add({ channelId: office, text: "Can someone look at my failing build?", asker: person("Ben"), plus: [person("David")], state: "open", createdAt: now - 25 * MINUTE, changedAt: now - 25 * MINUTE, look: true, until: "16:00" });
    add({ channelId: retro, text: "Who can proofread the offer for Nordwind? It is on the board.", asker: person("Eva"), plus: [], state: "open", createdAt: now - 20 * 60 * MINUTE, changedAt: now - 20 * 60 * MINUTE });
  }

  /** for the snapshot: equipment that differs from the defaults, and the boards the own user may enter */
  decorate(state: Snapshot): void {
    const equipment = Object.fromEntries([...this.equipmentOf].map(([id, e]) => [String(id), e]));
    if (Object.keys(equipment).length) state.equipment = equipment;
    if (!state.self) return;
    const boards: Record<string, TaskBoardSummary> = {};
    for (const [id, e] of this.equipmentOf) {
      if (e.taskboard && state.canEnter[String(id)] !== false) boards[String(id)] = summarizeTasks(this.requests.filter((r) => r.channelId === id));
    }
    if (Object.keys(boards).length) state.taskboards = boards;
  }

  /** someone else asks for help in a room with a board (debug panel, e2e) */
  askAsOther(): void {
    const st = this.host.state();
    const id = [...this.equipmentOf].find(([, e]) => e.taskboard)?.[0];
    const other = st.users.find((u) => u.session !== st.self?.session && u.ruumble);
    if (id === undefined || !other) return;
    const asker = { person: this.host.personOf(other.name), name: other.name };
    const r: TaskRequest = { id: `mock-task-${this.seq++}`, channelId: id, text: "Printer on the 2nd floor is jammed again", asker, plus: [], state: "open", createdAt: Date.now(), changedAt: Date.now() };
    this.requests.push(r);
    this.announce("asked", r, asker);
  }

  /** someone else takes on the own user's newest open request (e2e) */
  helpAs(name: string): void {
    const me = this.host.me();
    const r = [...this.requests].reverse().find((x) => x.state === "open" && x.asker.person === me?.person);
    if (!r) return;
    const helper = { person: this.host.personOf(name), name };
    const result = applyTaskAction(r, "take", helper, Date.now());
    if (typeof result === "string") return;
    this.requests[this.requests.indexOf(r)] = result.request;
    this.announce("taken", result.request, helper);
  }

  readonly equipment: EquipmentApi = {
    save: async (channelId, equipment) => {
      const parsed = Equipment.safeParse(equipment);
      if (!this.host.me()) return { ok: false, error: "not-paired" };
      if (!parsed.success) return { ok: false, error: "invalid" };
      if (!this.place(channelId)) return { ok: false, error: "no-board-here" };
      if (!this.host.state().care?.includes(channelId)) return { ok: false, error: "forbidden" };
      this.equipmentOf.set(channelId, parsed.data);
      this.host.emit();
      return { ok: true, value: parsed.data };
    },
  };

  readonly taskboard: TaskBoardApi = {
    load: async (channelId) => this.access(channelId, () => ({ channelId, name: this.name(channelId), equipment: this.get(channelId), requests: this.list(channelId) })),
    ask: async (channelId, request) =>
      this.access(channelId, (me) => {
        if (me.channel !== channelId) return "not-in-room";
        const body = NewTaskRequest.safeParse(request);
        if (!body.success) return "invalid";
        const { target: targetId, ...input } = body.data;
        let target: TaskPerson | undefined;
        if (targetId) {
          const user = this.host.state().users.find((u) => u.ruumble && this.host.personOf(u.name) === targetId);
          if (!user || targetId === me.person) return "invalid";
          target = { person: targetId, name: user.name };
        }
        const now = Date.now();
        const r: TaskRequest = {
          id: `mock-task-${this.seq++}`, channelId, text: input.text.replace(/\s+/g, " ").trim(), asker: { person: me.person, name: me.name },
          ...(input.until ? { until: input.until } : {}), ...(input.talk ? { talk: true } : {}), ...(input.look ? { look: true } : {}),
          ...(target ? { target } : {}), plus: [], state: "open", createdAt: now, changedAt: now,
        };
        this.requests.push(r);
        this.announce("asked", r, me);
        return r;
      }),
    act: async (id, action) => {
      const r = this.requests.find((x) => x.id === id);
      if (!r) return { ok: false, error: "not-found" };
      return this.access(r.channelId, (me) => {
        if (!TaskAction.safeParse(action).success) return "invalid";
        const result = applyTaskAction(r, action, { person: me.person, name: me.name }, Date.now());
        if (typeof result === "string") return result;
        this.requests[this.requests.indexOf(r)] = result.request;
        if (result.kind) this.announce(result.kind, result.request, me);
        else this.host.emit();
        return result.request;
      });
    },
    thank: async (id, thanks) => {
      const r = this.requests.find((x) => x.id === id);
      if (!r) return { ok: false, error: "not-found" };
      return this.access(r.channelId, (me) => {
        const body = NewThanks.safeParse(thanks);
        if (!body.success) return "invalid";
        if (r.asker.person !== me.person) return "forbidden";
        if (r.state !== "done" || !r.helper) return "invalid";
        r.thanks = { motif: body.data.motif, text: body.data.text, at: Date.now() };
        this.announce("thanks", r, me);
        return r;
      });
    },
    clear: async (channelId) => {
      if (!this.host.me()) return { ok: false, error: "not-paired" };
      if (!this.host.state().care?.includes(channelId)) return { ok: false, error: "forbidden" };
      const before = this.requests.length;
      this.requests = this.requests.filter((r) => r.channelId !== channelId);
      this.host.emit();
      return { ok: true, value: { posts: before - this.requests.length } };
    },
  };

  count(channelId: number): number {
    return this.requests.filter((r) => r.channelId === channelId).length;
  }

  private get(channelId: number): Equipment {
    return this.equipmentOf.get(channelId) ?? EQUIPMENT_DEFAULTS;
  }

  private list(channelId: number): TaskRequest[] {
    return this.requests.filter((r) => r.channelId === channelId).sort((a, b) => b.createdAt - a.createdAt).map((r) => structuredClone(r));
  }

  private name(id: number): string {
    return this.host.state().channels.find((c) => c.id === id)?.name ?? "";
  }

  /** a room (2nd level) or a floor */
  private place(id: number): boolean {
    const channels = this.host.state().channels;
    const c = channels.find((x) => x.id === id);
    if (!c || c.temporary || c.parent === null) return false;
    return c.parent === 0 || channels.find((x) => x.id === c.parent)?.parent === 0;
  }

  private access<T extends object>(channelId: number, fn: (me: TaskPerson & { channel: number }) => T | Refusal): BoardResult<T> {
    const me = this.host.me();
    if (!me) return { ok: false, error: "not-paired" };
    if (!this.place(channelId) || !this.get(channelId).taskboard) return { ok: false, error: "no-board-here" };
    if (this.host.state().canEnter[String(channelId)] === false) return { ok: false, error: "forbidden" };
    const value = fn(me);
    if (typeof value === "string") return { ok: false, error: value };
    return { ok: true, value: structuredClone(value) };
  }

  private announce(kind: TaskEventKind, r: TaskRequest, by: TaskPerson): void {
    this.host.emit();
    this.host.event({
      kind, channelId: r.channelId, room: this.name(r.channelId), requestId: r.id, by: { person: by.person, name: by.name }, text: r.text, asker: r.asker,
      ...(r.target ? { target: r.target } : {}), ...(r.helper ? { helper: r.helper } : {}), affected: 1 + r.plus.length,
      ...(kind === "thanks" && r.thanks ? { thanks: r.thanks } : {}), at: Date.now(),
    });
  }
}

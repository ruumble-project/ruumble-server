/**
 * The task board in the web UI (#29): the open sidebar, the plaques on the rooms and the thank-you card.
 */
import type { NewTaskRequest, Snapshot, TaskAction, TaskBoardView, TaskEvent, TaskPerson, TaskRequest, ThanksMotif } from "@ruumble/protocol";
import type { BoardErrorCode, MumbleAdapter } from "../adapter/types.ts";
import { relativeTime } from "../board/model.ts";
import { t } from "../i18n/index.svelte.ts";
import { noticeText, noticeTone } from "./model.ts";

/** a plaque on a room's outer wall */
export interface RoomNotice {
  key: number;
  text: string;
  tone: "signal" | "help" | "done";
}

/** how long a plaque stands (the component fades it in and out around this) */
export const NOTICE_MS = 12_000;
/** the notice on entering a room with open requests comes at most once per room in this time */
const ENTER_AGAIN_MS = 60 * 60_000;

export interface TaskBoardHooks {
  /** a short line at the bottom of the window */
  notice(text: string): void;
  /** the own user while their plugin is connected */
  me(): TaskPerson | null;
}

export class TaskBoardState {
  /** the channel whose sidebar is open, null: closed */
  channelId = $state<number | null>(null);
  view = $state<TaskBoardView | null>(null);
  error = $state<BoardErrorCode | null>(null);
  busy = $state(false);
  /** the thank-you card being written */
  thanking = $state<TaskRequest | null>(null);
  /** per channel: the plaque standing now, and how many wait behind it */
  notices = $state<Record<number, { current: RoomNotice; waiting: RoomNotice[] }>>({});

  private seq = 1;
  private lastChannel: number | null = null;
  private entered = new Map<number, number>();

  constructor(
    private readonly adapter: MumbleAdapter,
    private readonly hooks: TaskBoardHooks,
  ) {}

  async open(channelId: number): Promise<void> {
    this.channelId = channelId;
    await this.load();
  }

  close(): void {
    this.channelId = null;
    this.view = null;
    this.error = null;
  }

  async load(): Promise<void> {
    const id = this.channelId;
    if (id === null) return;
    const r = await this.adapter.taskboard.load(id);
    if (this.channelId !== id) return;
    if (r.ok) {
      this.view = r.value;
      this.error = null;
    } else {
      this.view = null;
      this.error = r.error;
    }
  }

  async ask(request: NewTaskRequest): Promise<boolean> {
    if (this.channelId === null || this.busy) return false;
    this.busy = true;
    const r = await this.adapter.taskboard.ask(this.channelId, request);
    this.busy = false;
    if (!r.ok) {
      const text = t().boardErrors[r.error];
      this.hooks.notice(typeof text === "string" ? text : t().taskboard.failed);
      return false;
    }
    this.replace(r.value);
    return true;
  }

  async act(request: TaskRequest, action: TaskAction): Promise<boolean> {
    const r = await this.adapter.taskboard.act(request.id, action);
    if (!r.ok) {
      this.hooks.notice(t().taskboard.failed);
      void this.load();
      return false;
    }
    this.replace(r.value);
    // the asker closes it: the card right away (they may also skip it)
    if (action === "done" && r.value.asker.person === this.hooks.me()?.person && r.value.helper) this.thanking = r.value;
    return true;
  }

  async thank(request: TaskRequest, motif: ThanksMotif, text: string): Promise<boolean> {
    const r = await this.adapter.taskboard.thank(request.id, { motif, text });
    if (!r.ok) {
      this.hooks.notice(t().taskboard.failed);
      return false;
    }
    this.replace(r.value);
    this.thanking = null;
    return true;
  }

  /** an event from the service: the plaque on the room, the open sidebar reloads, the asker is offered the card */
  receive(event: TaskEvent): void {
    if (event.channelId === this.channelId) void this.load();
    this.show(event.channelId, { text: noticeText(event), tone: noticeTone(event.kind) });
    const me = this.hooks.me();
    if (event.kind === "done" && me && event.asker.person === me.person && event.by.person !== me.person && event.helper) {
      this.hooks.notice(t().taskboard.thanks.offer(event.helper.name));
    }
  }

  /** after every snapshot: entering a room with open requests shows a plaque, to the one coming in only */
  observe(snapshot: Snapshot, now = Date.now()): void {
    const channel = snapshot.users.find((u) => u.session === snapshot.self?.session)?.channel ?? null;
    const before = this.lastChannel;
    this.lastChannel = channel;
    if (channel === null || channel === before || before === null) return;
    const summary = snapshot.taskboards?.[String(channel)];
    if (!summary || summary.open === 0 || summary.oldest === null) return;
    const last = this.entered.get(channel);
    if (last !== undefined && now - last < ENTER_AGAIN_MS) return;
    this.entered.set(channel, now);
    this.show(channel, { text: t().taskboard.notice.entered(summary.open, relativeTime(summary.oldest, now)), tone: "signal" });
  }

  /** the plaque of a channel stood its time: the next one, if any */
  expire(channelId: number, key: number): void {
    const n = this.notices[channelId];
    if (!n || n.current.key !== key) return;
    const [next, ...rest] = n.waiting;
    const copy = { ...this.notices };
    if (next) copy[channelId] = { current: next, waiting: rest };
    else delete copy[channelId];
    this.notices = copy;
  }

  private show(channelId: number, notice: Omit<RoomNotice, "key">): void {
    const item = { ...notice, key: this.seq++ };
    const n = this.notices[channelId];
    this.notices = { ...this.notices, [channelId]: n ? { current: n.current, waiting: [...n.waiting, item].slice(-5) } : { current: item, waiting: [] } };
  }

  private replace(request: TaskRequest): void {
    const v = this.view;
    if (!v || v.channelId !== request.channelId) return;
    const others = v.requests.filter((r) => r.id !== request.id);
    this.view = { ...v, requests: [request, ...others] };
  }
}

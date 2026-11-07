/**
 * Ruumble Client (#19): listening in on another room. Only exists with a client whose `desk` object has
 * `startListening` (DeskState.listen stays null with older ones and in a browser).
 *
 * Mumble stays the source of truth (ADR-0003): a door opens only when the client reports the listening, which it does
 * once the server confirmed it. Until then the room is `pending`. The rules (own floor only, ...) are checked by the
 * page (model/listening.ts), which ends what breaks them through `stop`.
 */
import { clampVolume, LISTEN_VOLUME } from "../model/listening.ts";
import { parseListening, parseRefusal, type Listened, type ListenRefusal } from "./listen.ts";

interface Signal<T extends unknown[] = []> {
  connect(handler: (...args: T) => void): void;
}

/** the part of the client's `desk` object for listening in (DeskChannel.h) */
export interface ListenObject {
  listening: unknown;
  listenQuieter: boolean;
  listeningChanged: Signal;
  listenQuieterChanged: Signal;
  listeningRefused: Signal<[number, string]>;
  startListening(channelId: number): void;
  stopListening(channelIds: number[]): void;
  setListeningVolume(channelId: number, db: number): void;
  setListenQuieter(on: boolean): void;
}

export function hasListen(desk: object): desk is ListenObject {
  const d = desk as Partial<ListenObject>;
  return typeof d.startListening === "function" && typeof d.stopListening === "function" && typeof d.setListeningVolume === "function";
}

/** how long a door waits for the server before it gives up quietly */
const PENDING_MS = 5000;

export class DeskListen {
  /** the rooms the own user listens to, with their volume */
  listened = $state<Listened[]>([]);
  /** Mumble's listener attenuation: quieter while someone talks in the own room */
  quieter = $state(true);
  /** rooms whose door was clicked and the server has not answered yet */
  pending = $state<number[]>([]);

  /** rooms whose listening ended because the own user went in: it starts again when they leave (#22); not shown */
  paused = new Set<number>();
  /** the rooms started from Ruumble: they get the discreet start volume */
  private started = new Set<number>();
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly desk: ListenObject,
    private readonly refused: (channel: number, reason: ListenRefusal) => void = () => {},
  ) {
    this.read();
    desk.listeningChanged.connect(() => this.read());
    desk.listenQuieterChanged.connect(() => (this.quieter = desk.listenQuieter === true));
    desk.listeningRefused.connect((channel, reason) => {
      this.settle(channel);
      this.started.delete(channel);
      this.refused(channel, parseRefusal(reason));
    });
  }

  readonly channels = $derived(this.listened.map((l) => l.channel));

  isListening(channel: number): boolean {
    return this.listened.some((l) => l.channel === channel);
  }

  volumeOf(channel: number): number {
    return clampVolume(this.listened.find((l) => l.channel === channel)?.volume);
  }

  private read(): void {
    const before = new Set(this.channels);
    this.listened = parseListening(this.desk.listening);
    this.quieter = this.desk.listenQuieter === true;
    for (const { channel, volume } of this.listened) {
      if (!before.has(channel)) this.settle(channel);
      // started here and Mumble has no volume of its own for it yet: audible, but very discreet
      if (this.started.delete(channel) && volume === 0) this.setVolume(channel, LISTEN_VOLUME.start);
    }
    for (const channel of before) if (!this.isListening(channel)) this.settle(channel);
  }

  private wait(channel: number): void {
    this.settle(channel);
    this.pending = [...this.pending, channel];
    this.timers.set(channel, setTimeout(() => {
      this.settle(channel);
      this.started.delete(channel); // a report after this is not the answer to the click
    }, PENDING_MS));
  }

  private settle(channel: number): void {
    clearTimeout(this.timers.get(channel));
    this.timers.delete(channel);
    if (this.pending.includes(channel)) this.pending = this.pending.filter((c) => c !== channel);
  }

  /** the door clicked: open it, or close it again */
  toggle(channel: number): void {
    if (this.pending.includes(channel)) return;
    if (this.isListening(channel)) return this.stop([channel]);
    this.start(channel);
  }

  /** listen in on a room (the door, or listening resumed after leaving the room, #22) */
  start(channel: number): void {
    if (this.pending.includes(channel) || this.isListening(channel)) return;
    this.started.add(channel);
    this.wait(channel);
    this.desk.startListening(channel);
  }

  stop(channels: readonly number[]): void {
    const listened = channels.filter((c) => this.isListening(c));
    if (!listened.length) return;
    for (const c of listened) this.wait(c);
    this.desk.stopListening([...listened]);
  }

  stopAll(): void {
    this.paused.clear();
    this.stop(this.channels);
  }

  setVolume(channel: number, db: number): void {
    const volume = clampVolume(db);
    // the slider follows at once; Mumble's report confirms it
    this.listened = this.listened.map((l) => (l.channel === channel ? { ...l, volume } : l));
    this.desk.setListeningVolume(channel, volume);
  }

  setQuieter(on: boolean): void {
    this.quieter = on;
    this.desk.setListenQuieter(on);
  }
}

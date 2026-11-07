// Listening in inside Ruumble Client (#19): what the client reports and the state over a fake desk.
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseListening, parseRefusal } from "../src/lib/desk/listen.ts";
import { DeskListen, hasListen, type ListenObject } from "../src/lib/desk/listen.svelte.ts";
import { DeskState } from "../src/lib/desk/state.svelte.ts";

describe("what the client reports", () => {
  it("parseListening: rooms with their volume; malformed entries and duplicates are dropped", () => {
    expect(parseListening([{ channel: 4, volume: -15 }, { channel: 4, volume: 0 }, { channel: 5 }, { channel: "6" }, null, 7, { channel: 1.5 }])).toEqual([
      { channel: 4, volume: -15 }, { channel: 5, volume: 0 },
    ]);
    expect(parseListening(undefined)).toEqual([]);
  });

  it("parseRefusal: Mumble's permission and listener limits, anything else as other", () => {
    expect(["permission", "channel-limit", "user-limit", "nope", 3].map(parseRefusal)).toEqual(["permission", "channel-limit", "user-limit", "other", "other"]);
  });
});

/** a fake of the client's desk object: the server confirms after `confirm()` like Mumble's echo */
function fakeDesk() {
  const handlers = new Map<string, ((...v: unknown[]) => void)[]>();
  const signal = (name: string) => ({ connect: (h: (...v: unknown[]) => void) => handlers.set(name, [...(handlers.get(name) ?? []), h]) });
  const emit = (name: string, ...value: unknown[]) => handlers.get(name)?.forEach((h) => h(...value));
  const calls: unknown[][] = [];
  const desk = {
    listening: [] as { channel: number; volume: number }[],
    listenQuieter: true,
    listeningChanged: signal("listeningChanged"),
    listenQuieterChanged: signal("listenQuieterChanged"),
    listeningRefused: signal("listeningRefused"),
    startListening: (c: number) => calls.push(["start", c]),
    stopListening: (cs: number[]) => calls.push(["stop", cs]),
    setListeningVolume: (c: number, db: number) => calls.push(["volume", c, db]),
    setListenQuieter: (on: boolean) => calls.push(["quieter", on]),
  };
  const report = (listening: { channel: number; volume: number }[]) => {
    desk.listening = listening;
    emit("listeningChanged");
  };
  return { desk: desk as ListenObject & typeof desk, calls, emit, report };
}

afterEach(() => vi.useRealTimers());

describe("DeskListen", () => {
  it("is there only with a client that can listen", () => {
    expect(hasListen(fakeDesk().desk)).toBe(true);
    expect(hasListen({ startListening: () => {} })).toBe(false);
  });

  it("a door opens only once the server confirms; a room started here gets the discreet start volume", () => {
    const { desk, calls, report } = fakeDesk();
    const listen = new DeskListen(desk);
    listen.toggle(4);
    expect(calls).toEqual([["start", 4]]);
    expect(listen.isListening(4)).toBe(false);
    expect(listen.pending).toEqual([4]);
    listen.toggle(4); // a second click while waiting does nothing
    expect(calls).toHaveLength(1);
    report([{ channel: 4, volume: 0 }]);
    expect(listen.isListening(4)).toBe(true);
    expect(listen.pending).toEqual([]);
    expect(calls.at(-1)).toEqual(["volume", 4, -15]);
    expect(listen.volumeOf(4)).toBe(-15);
  });

  it("a room Mumble already has a volume for keeps it; listening restored by Mumble is not touched", () => {
    const { desk, calls, report } = fakeDesk();
    const listen = new DeskListen(desk);
    listen.toggle(4);
    report([{ channel: 4, volume: -6 }, { channel: 9, volume: 0 }]);
    expect(calls).toEqual([["start", 4]]);
    expect(listen.channels).toEqual([4, 9]);
  });

  it("a second click closes the door; stopping only sends rooms that are listened to", () => {
    const { desk, calls, report } = fakeDesk();
    desk.listening = [{ channel: 4, volume: -15 }, { channel: 5, volume: -15 }];
    const listen = new DeskListen(desk);
    listen.toggle(4);
    expect(calls).toEqual([["stop", [4]]]);
    expect(listen.pending).toEqual([4]);
    report([{ channel: 5, volume: -15 }]);
    expect(listen.pending).toEqual([]);
    listen.stop([7]);
    expect(calls).toHaveLength(1);
    listen.stopAll();
    expect(calls.at(-1)).toEqual(["stop", [5]]);
  });

  it("a refusal closes the door again and is passed on; a server that never answers lets go after a while", () => {
    vi.useFakeTimers();
    const { desk, emit } = fakeDesk();
    const refused: unknown[] = [];
    const listen = new DeskListen(desk, (c, r) => refused.push([c, r]));
    listen.toggle(4);
    emit("listeningRefused", 4, "permission");
    expect(listen.pending).toEqual([]);
    expect(refused).toEqual([[4, "permission"]]);
    listen.toggle(6);
    vi.advanceTimersByTime(5000);
    expect(listen.pending).toEqual([]);
  });

  it("volume and the attenuation switch: the page follows at once, the client is told", () => {
    const { desk, calls, emit } = fakeDesk();
    desk.listening = [{ channel: 4, volume: -15 }];
    const listen = new DeskListen(desk);
    listen.setVolume(4, 40);
    expect(listen.volumeOf(4)).toBe(12);
    expect(calls.at(-1)).toEqual(["volume", 4, 12]);
    expect(listen.volumeOf(99)).toBe(-15);
    listen.setQuieter(false);
    expect(listen.quieter).toBe(false);
    expect(calls.at(-1)).toEqual(["quieter", false]);
    desk.listenQuieter = true;
    emit("listenQuieterChanged");
    expect(listen.quieter).toBe(true);
  });

  it("DeskState creates it for such a client and passes refusals to the app", () => {
    const { desk, emit } = fakeDesk();
    const full = { ...desk, version: "1.6.0", server: "", history: (cb: (e: unknown[]) => void) => cb([]), logged: { connect() {} }, serverChanged: { connect() {} } };
    const state = new DeskState();
    const refusals: unknown[] = [];
    state.onListenRefused = (c, r) => refusals.push([c, r]);
    state.start({ qt: { webChannelTransport: {} }, QWebChannel: class { constructor(_t: unknown, ready: (c: { objects: { desk: unknown } }) => void) { ready({ objects: { desk: full } }); } } } as never);
    expect(state.listen).not.toBeNull();
    state.listen!.toggle(3);
    emit("listeningRefused", 3, "user-limit");
    expect(refusals).toEqual([[3, "user-limit"]]);
  });
});

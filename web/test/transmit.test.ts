// How the user transmits inside Ruumble Client (#9 in ruumble-client): the pure model and the state over a fake desk.
import { describe, expect, it, vi } from "vitest";
import { DeskState } from "../src/lib/desk/state.svelte.ts";
import {
  KeyWatch, NO_KEY, keyName, keyText, mouseCode, parseKey, parseLevel, parseMode, parseOptions,
} from "../src/lib/desk/transmit.ts";
import { DeskTransmit, hasTransmit, type TransmitObject } from "../src/lib/desk/transmit.svelte.ts";
import { de } from "../src/lib/i18n/de.ts";
import { en } from "../src/lib/i18n/en.ts";

describe("the transmit model", () => {
  it("reads the mode, key, options and level the client reports, and nothing else", () => {
    expect(parseMode("ptt")).toBe("ptt");
    expect(parseMode("talk")).toBeNull();
    expect(parseKey(null)).toEqual(NO_KEY);
    expect(parseKey({ set: true, label: "Control_R", codes: ["ControlRight", 3], scope: "window", warn: true })).toEqual({
      set: true, label: "Control_R", codes: ["ControlRight"], scope: "window", warn: true,
    });
    expect(parseKey({ set: "yes", scope: "elsewhere" })).toEqual({ ...NO_KEY });
    expect(parseOptions({ doublePush: true })).toEqual({ doublePush: true, audioCue: false });
    expect(parseOptions(undefined)).toEqual({ doublePush: false, audioCue: false });
    expect(parseLevel(0.4)).toBe(0.4);
    expect(parseLevel(3)).toBe(1);
    expect(parseLevel(-1)).toBe(0);
    expect(parseLevel(Number.NaN)).toBe(0);
    expect(parseLevel("loud")).toBe(0);
  });

  it("names keys in the user's language", () => {
    const names = en.transmit.keyNames;
    expect(keyName("ControlRight", names)).toBe("Right Ctrl");
    expect(keyName("ControlRight", de.transmit.keyNames)).toBe("Strg rechts");
    expect(keyName("KeyQ", names)).toBe("Q");
    expect(keyName("Digit7", names)).toBe("7");
    expect(keyName("Numpad4", names)).toBe("Numpad 4");
    expect(keyName("ArrowLeft", names)).toBe("←");
    expect(keyName("F8", names)).toBe("F8");
    expect(keyText({ codes: ["ControlLeft", "Space"], label: "" }, names)).toBe("Left Ctrl + Space");
    expect(keyText({ codes: [], label: "XF86Launch5" }, names)).toBe("XF86Launch5");
  });

  it("knows the mouse buttons a person binds to talk", () => {
    expect([0, 1, 2, 3, 4].map(mouseCode)).toEqual([null, "MouseMiddle", null, "MouseBack", "MouseForward"]);
  });

  it("holds a combination only while all of its keys are down, and nothing after the window lost the focus", () => {
    const watch = new KeyWatch(["ControlLeft", "Space"]);
    expect(watch.update("ControlLeft", true)).toBe(false);
    expect(watch.update("KeyA", true)).toBe(false);
    expect(watch.update("Space", true)).toBe(true);
    expect(watch.update("ControlLeft", false)).toBe(false);
    expect(watch.update("ControlLeft", true)).toBe(true);
    expect(watch.reset()).toBe(false);
    expect(watch.held).toBe(false);
    expect(new KeyWatch([]).held).toBe(false);
  });
});

/** a fake of the client's desk object: properties change and their signals fire as QWebChannel does it */
function fakeDesk(init: Partial<Record<"transmitMode" | "pttKey", unknown>> = {}) {
  const handlers = new Map<string, ((v?: unknown) => void)[]>();
  const signal = (name: string) => ({ connect: (h: (v?: unknown) => void) => handlers.set(name, [...(handlers.get(name) ?? []), h]) });
  const emit = (name: string, value?: unknown) => handlers.get(name)?.forEach((h) => h(value));
  const calls: unknown[][] = [];
  const desk = {
    transmitMode: init.transmitMode ?? "vad",
    transmitting: false,
    micLevel: 0,
    latched: false,
    pttKey: init.pttKey ?? { set: false, label: "", codes: [], scope: "global", warn: false },
    pttOptions: { doublePush: false, audioCue: true },
    transmitModeChanged: signal("transmitModeChanged"),
    transmittingChanged: signal("transmittingChanged"),
    micLevelChanged: signal("micLevelChanged"),
    latchedChanged: signal("latchedChanged"),
    pttKeyChanged: signal("pttKeyChanged"),
    pttOptionsChanged: signal("pttOptionsChanged"),
    keyCaptured: signal("keyCaptured"),
    setTransmitMode: (mode: string) => {
      calls.push(["setTransmitMode", mode]);
      desk.transmitMode = mode;
      emit("transmitModeChanged");
    },
    pushToTalk: (down: boolean) => calls.push(["pushToTalk", down]),
    setLatched: (on: boolean) => calls.push(["setLatched", on]),
    watchLevel: (on: boolean) => calls.push(["watchLevel", on]),
    captureKey: () => calls.push(["captureKey"]),
    capturePageKey: (codes: string[]) => calls.push(["capturePageKey", codes]),
    cancelCapture: () => calls.push(["cancelCapture"]),
    acceptKey: (cb: (ok: boolean) => void) => {
      calls.push(["acceptKey"]);
      cb(true);
    },
    setPttOption: (name: string, value: unknown) => calls.push(["setPttOption", name, value]),
  };
  return { desk: desk as TransmitObject & typeof desk, calls, emit };
}

const RIGHT_CTRL = { set: true, label: "Control_R", codes: ["ControlRight"], scope: "global", warn: false };

describe("DeskTransmit", () => {
  it("exists only with a client that knows transmitting", () => {
    expect(hasTransmit(fakeDesk().desk)).toBe(true);
    expect(hasTransmit({ version: "1.6.0" })).toBe(false);
    const state = new DeskState();
    const { desk } = fakeDesk();
    state.start({ qt: { webChannelTransport: {} }, QWebChannel: class {
      constructor(_t: unknown, ready: (c: { objects: { desk: unknown } }) => void) {
        ready({ objects: { desk: { ...desk, logged: { connect: () => {} }, serverChanged: { connect: () => {} }, history: (cb: (e: unknown[]) => void) => cb([]) } } });
      }
    } } as never);
    expect(state.transmit?.mode).toBe("vad");
  });

  it("follows the client: mode, talk state, level, latch, key and options", () => {
    const { desk, emit } = fakeDesk();
    const tr = new DeskTransmit(desk);
    Object.assign(desk, { transmitting: true, micLevel: 0.5, latched: true, pttKey: RIGHT_CTRL, pttOptions: { doublePush: true, audioCue: false } });
    emit("transmittingChanged");
    expect(tr.transmitting).toBe(true);
    expect(tr.level).toBe(0.5);
    expect(tr.latched).toBe(true);
    expect(tr.key.codes).toEqual(["ControlRight"]);
    expect(tr.options).toEqual({ doublePush: true, audioCue: false });
  });

  it("sends one press for mouse and window key together and lets go when both are up", () => {
    const { desk, calls } = fakeDesk({ transmitMode: "ptt", pttKey: RIGHT_CTRL });
    const tr = new DeskTransmit(desk);
    tr.pressMouse(true);
    tr.pressKey(true);
    tr.pressMouse(false);
    expect(tr.pressing).toBe(true);
    tr.pressKey(false);
    expect(calls).toEqual([["pushToTalk", true], ["pushToTalk", false]]);
    tr.pressMouse(true);
    tr.setLatched(true);
    expect(calls.slice(2)).toEqual([["pushToTalk", true], ["pushToTalk", false], ["setLatched", true]]);
  });

  it("lets go of a press when the client leaves push-to-talk", () => {
    const { desk, calls } = fakeDesk({ transmitMode: "ptt", pttKey: RIGHT_CTRL });
    const tr = new DeskTransmit(desk);
    tr.pressMouse(true);
    tr.setMode("vad");
    expect(tr.pressing).toBe(false);
    expect(calls).toEqual([["pushToTalk", true], ["setTransmitMode", "vad"], ["pushToTalk", false]]);
  });

  it("asks for a key when push-to-talk is chosen without one, and binds the suggestion or the captured key", async () => {
    const { desk, calls, emit } = fakeDesk();
    const tr = new DeskTransmit(desk);
    tr.setMode("ptt");
    expect(tr.keyDialogOpen).toBe(true);
    expect(calls).toEqual([["setTransmitMode", "ptt"], ["captureKey"]]);
    // nothing captured yet: the suggestion is bound
    expect(await tr.accept("ControlRight")).toBe(true);
    expect(calls.slice(2)).toEqual([["capturePageKey", ["ControlRight"]], ["acceptKey"], ["cancelCapture"]]);
    expect(tr.keyDialogOpen).toBe(false);

    // captured: shown, and the client listens again for another one; accepting binds the captured one
    tr.openKeyDialog();
    calls.length = 0;
    emit("keyCaptured", { set: true, label: "Pause", codes: ["Pause"], scope: "global", warn: false });
    expect(tr.captured?.codes).toEqual(["Pause"]);
    expect(calls).toEqual([["captureKey"]]);
    tr.offer([]);
    tr.offer(["MouseBack"]);
    expect(await tr.accept("ControlRight")).toBe(true);
    expect(calls.slice(1)).toEqual([["capturePageKey", ["MouseBack"]], ["acceptKey"], ["cancelCapture"]]);
    // a capture arriving with the dialog closed is ignored
    emit("keyCaptured", RIGHT_CTRL);
    expect(tr.captured).toBeNull();
  });

  it("keeps the dialog open when the client could not bind the key", async () => {
    const { desk } = fakeDesk();
    desk.acceptKey = (cb: (ok: boolean) => void) => cb(false);
    const tr = new DeskTransmit(desk);
    tr.openKeyDialog();
    tr.closeKeyDialog();
    tr.openKeyDialog();
    expect(await tr.accept("ControlRight")).toBe(false);
    expect(tr.keyDialogOpen).toBe(true);
  });

  it("watches the level while anyone looks, and passes options on", () => {
    const { desk, calls } = fakeDesk();
    const tr = new DeskTransmit(desk);
    tr.watchLevel(true);
    tr.watchLevel(true);
    tr.watchLevel(false);
    tr.watchLevel(false);
    tr.watchLevel(false);
    tr.setOption("doublePush", true);
    expect(calls).toEqual([["watchLevel", true], ["watchLevel", true], ["watchLevel", true], ["watchLevel", false], ["watchLevel", false], ["setPttOption", "doublePush", true]]);
  });

  it("listens for the key in the window only where the client cannot (Wayland), and lets go on blur", () => {
    const { desk, calls, emit } = fakeDesk({ transmitMode: "ptt", pttKey: RIGHT_CTRL });
    const tr = new DeskTransmit(desk);
    expect(tr.listensInWindow).toBe(false);
    Object.assign(desk, { pttKey: { ...RIGHT_CTRL, codes: ["ControlRight", "MouseBack"], scope: "window" } });
    emit("pttKeyChanged");
    expect(tr.listensInWindow).toBe(true);

    const win = new EventTarget() as unknown as Window;
    const stop = tr.listen(win);
    const key = (type: string, code: string, repeat = false) => win.dispatchEvent(Object.assign(new Event(type), { code, repeat }));
    const mouse = (type: string, button: number) => {
      const e = Object.assign(new Event(type, { cancelable: true }), { button });
      win.dispatchEvent(e);
      return e.defaultPrevented;
    };
    key("keydown", "ControlRight");
    key("keydown", "ControlRight", true);
    expect(mouse("pointerdown", 0)).toBe(false);
    expect(mouse("pointerdown", 3)).toBe(true);
    expect(tr.pressing).toBe(true);
    expect(mouse("mouseup", 3)).toBe(true);
    expect(mouse("mouseup", 4)).toBe(false);
    win.dispatchEvent(new Event("blur"));
    expect(tr.pressing).toBe(false);
    key("keydown", "ControlRight");
    mouse("pointerdown", 3);
    mouse("pointerup", 3);
    stop();
    // both buttons make the key (a combination): down only while both are down
    expect(calls).toEqual([["pushToTalk", true], ["pushToTalk", false], ["pushToTalk", true], ["pushToTalk", false]]);
  });
});

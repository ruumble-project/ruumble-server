/**
 * Ruumble Client (#9 in ruumble-client): how the user transmits, as the client's `desk` object reports it. Only
 * exists with a client that has `transmitMode` (DeskState.transmit stays null with older ones).
 *
 * Mumble stays the source of truth: the mode, the key and whether the user is transmitting are read from the client
 * and change only when it says so. The one thing shown at once is the page's own press (`pressing`), so holding the
 * microphone feels immediate. The client lets go of the page's presses by itself when the page goes away.
 */
import {
  KeyWatch, mouseCode, NO_KEY, parseKey, parseLevel, parseMode, parseOptions,
  type PttKey, type PttOptions, type TransmitMode,
} from "./transmit.ts";

interface Signal<T = void> {
  connect(handler: (value: T) => void): void;
}

/** the part of the client's `desk` object for transmitting (DeskChannel.h); results arrive in callbacks */
export interface TransmitObject {
  transmitMode: string;
  transmitting: boolean;
  micLevel: number;
  latched: boolean;
  pttKey: unknown;
  pttOptions: unknown;
  transmitModeChanged: Signal;
  transmittingChanged: Signal;
  micLevelChanged: Signal;
  latchedChanged: Signal;
  pttKeyChanged: Signal;
  pttOptionsChanged: Signal;
  keyCaptured: Signal<unknown>;
  setTransmitMode(mode: string, callback?: (ok: boolean) => void): void;
  pushToTalk(down: boolean): void;
  setLatched(on: boolean): void;
  watchLevel(on: boolean): void;
  captureKey(callback?: (ok: boolean) => void): void;
  capturePageKey(codes: string[]): void;
  cancelCapture(): void;
  acceptKey(callback: (ok: boolean) => void): void;
  setPttOption(name: string, value: unknown, callback?: (ok: boolean) => void): void;
}

export function hasTransmit(desk: object): desk is TransmitObject {
  const d = desk as Partial<TransmitObject>;
  return typeof d.transmitMode === "string" && typeof d.pushToTalk === "function" && typeof d.captureKey === "function";
}

export class DeskTransmit {
  mode = $state<TransmitMode>("vad");
  /** the own user is transmitting (Mumble's talk state: also from the global key or voice activation) */
  transmitting = $state(false);
  /** the microphone level, 0..1, while watched or transmitting */
  level = $state(0);
  latched = $state(false);
  key = $state<PttKey>(NO_KEY);
  options = $state<PttOptions>({ doublePush: false, audioCue: false });
  /** the page's own press is down (mouse on the microphone, or the key while it only works in the window) */
  pressing = $state(false);
  keyDialogOpen = $state(false);
  /** the key the dialog would bind: the last one captured, null while it still shows the suggestion */
  captured = $state<PttKey | null>(null);

  private mouse = false;
  private windowKey = false;
  private watchers = 0;

  constructor(private readonly desk: TransmitObject) {
    this.read();
    for (const signal of [desk.transmitModeChanged, desk.transmittingChanged, desk.micLevelChanged, desk.latchedChanged, desk.pttKeyChanged, desk.pttOptionsChanged]) {
      signal.connect(() => this.read());
    }
    desk.keyCaptured.connect((raw) => {
      if (!this.keyDialogOpen) return;
      this.captured = parseKey(raw);
      desk.captureKey(); // listen again: another key replaces this one, the one shown stays bound on accept
    });
  }

  private read(): void {
    const d = this.desk;
    this.mode = parseMode(d.transmitMode) ?? "vad";
    this.transmitting = d.transmitting === true;
    this.level = parseLevel(d.micLevel);
    this.latched = d.latched === true;
    this.key = parseKey(d.pttKey);
    this.options = parseOptions(d.pttOptions);
    if (this.mode !== "ptt") this.letGo();
  }

  /** switching to push-to-talk without a key asks for one right away */
  setMode(mode: TransmitMode): void {
    this.desk.setTransmitMode(mode);
    if (mode === "ptt" && !this.key.set) this.openKeyDialog();
  }

  /** the microphone held with the mouse or touch */
  pressMouse(down: boolean): void {
    this.mouse = down;
    this.sync();
  }

  /** the bound key in the window (Wayland, where the client hears no keys of its own) */
  pressKey(down: boolean): void {
    this.windowKey = down;
    this.sync();
  }

  private sync(): void {
    const down = this.mouse || this.windowKey;
    if (down === this.pressing) return;
    this.pressing = down;
    this.desk.pushToTalk(down);
  }

  /** lets go of the page's press (blur, mode change) */
  letGo(): void {
    this.mouse = false;
    this.windowKey = false;
    this.sync();
  }

  setLatched(on: boolean): void {
    if (on) this.letGo(); // the latch takes over from the press
    this.desk.setLatched(on);
  }

  /** the level is only sent while someone looks at it (the menu) or while transmitting */
  watchLevel(on: boolean): void {
    this.watchers = Math.max(0, this.watchers + (on ? 1 : -1));
    this.desk.watchLevel(this.watchers > 0);
  }

  setOption(name: keyof PttOptions, value: boolean): void {
    this.desk.setPttOption(name, value);
  }

  openKeyDialog(): void {
    this.captured = null;
    this.keyDialogOpen = true;
    this.desk.captureKey();
  }

  closeKeyDialog(): void {
    this.desk.cancelCapture();
    this.keyDialogOpen = false;
    this.captured = null;
  }

  /** a key or mouse button the page saw in the dialog (the only source on Wayland), or a suggestion chosen */
  offer(codes: string[]): void {
    if (codes.length > 0) this.desk.capturePageKey(codes);
  }

  /** binds what the dialog shows: the captured key, else the suggestion `fallback` */
  accept(fallback: string): Promise<boolean> {
    if (!this.captured) this.desk.capturePageKey([fallback]);
    return new Promise((resolve) => {
      this.desk.acceptKey((ok) => {
        if (ok) this.closeKeyDialog();
        resolve(ok === true);
      });
    });
  }

  /** whether the page listens for the key itself: push-to-talk, a key that works only in the window, no dialog open */
  get listensInWindow(): boolean {
    return this.mode === "ptt" && this.key.scope === "window" && this.key.codes.length > 0 && !this.keyDialogOpen;
  }

  /** listens for the bound key in the window; returns the cleanup */
  listen(win: Window): () => void {
    const watch = new KeyWatch(this.key.codes);
    const key = (e: KeyboardEvent, down: boolean) => {
      if (e.repeat) return;
      this.pressKey(watch.update(e.code, down));
    };
    const pointer = (e: PointerEvent | MouseEvent, down: boolean) => {
      const code = mouseCode(e.button);
      if (!code || !this.key.codes.includes(code)) return;
      e.preventDefault(); // the back and forward buttons would leave the page
      this.pressKey(watch.update(code, down));
    };
    const onkeydown = (e: KeyboardEvent) => key(e, true);
    const onkeyup = (e: KeyboardEvent) => key(e, false);
    const onpointerdown = (e: PointerEvent) => pointer(e, true);
    const onpointerup = (e: PointerEvent) => pointer(e, false);
    const onmouseup = (e: MouseEvent) => {
      if (mouseCode(e.button) && this.key.codes.includes(mouseCode(e.button) ?? "")) e.preventDefault();
    };
    const onblur = () => this.pressKey(watch.reset());
    win.addEventListener("keydown", onkeydown, true);
    win.addEventListener("keyup", onkeyup, true);
    win.addEventListener("pointerdown", onpointerdown, true);
    win.addEventListener("pointerup", onpointerup, true);
    win.addEventListener("mouseup", onmouseup, true);
    win.addEventListener("blur", onblur);
    return () => {
      win.removeEventListener("keydown", onkeydown, true);
      win.removeEventListener("keyup", onkeyup, true);
      win.removeEventListener("pointerdown", onpointerdown, true);
      win.removeEventListener("pointerup", onpointerup, true);
      win.removeEventListener("mouseup", onmouseup, true);
      win.removeEventListener("blur", onblur);
      this.pressKey(false);
    };
  }
}

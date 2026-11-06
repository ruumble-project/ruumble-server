/**
 * Ruumble Client (#9 in ruumble-client): how the user transmits. Pure functions over what the client's `desk` object
 * reports (contract in the client's DeskChannel.h): the transmit mode, the push-to-talk key and the page's own key
 * presses while the key only works in the window (Wayland).
 */

export type TransmitMode = "vad" | "ptt" | "continuous";

export const TRANSMIT_MODES: readonly TransmitMode[] = ["vad", "ptt", "continuous"];

/** where the key works: everywhere (X11) or only while Ruumble Client has the focus (Wayland) */
export type KeyScope = "global" | "window";

export interface PttKey {
  set: boolean;
  /** Mumble's own name for it ("Control_R"), shown when the page has no name of its own */
  label: string;
  /** DOM codes ("ControlRight") or "MouseBack" / "MouseForward" / "MouseMiddle"; empty when one is unknown */
  codes: string[];
  scope: KeyScope;
  /** a key that types or acts in other programs as well */
  warn: boolean;
}

export interface PttOptions {
  doublePush: boolean;
  audioCue: boolean;
}

export const NO_KEY: PttKey = { set: false, label: "", codes: [], scope: "global", warn: false };

/** the key suggested when none is bound (Bert's choice in #9: Ctrl, the right one, which rarely acts on its own) */
export const SUGGESTED_KEY = "ControlRight";
/** the suggestions in the key dialog: keys that do nothing on their own */
export const SUGGESTED_KEYS: readonly string[] = [SUGGESTED_KEY, "MouseBack", "Pause"];

export function parseMode(raw: unknown): TransmitMode | null {
  return TRANSMIT_MODES.includes(raw as TransmitMode) ? (raw as TransmitMode) : null;
}

export function parseKey(raw: unknown): PttKey {
  if (!raw || typeof raw !== "object") return NO_KEY;
  const { set, label, codes, scope, warn } = raw as Record<string, unknown>;
  return {
    set: set === true,
    label: typeof label === "string" ? label : "",
    codes: Array.isArray(codes) ? codes.filter((c): c is string => typeof c === "string") : [],
    scope: scope === "window" ? "window" : "global",
    warn: warn === true,
  };
}

export function parseOptions(raw: unknown): PttOptions {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { doublePush: o.doublePush === true, audioCue: o.audioCue === true };
}

/** 0..1, anything else is silence */
export function parseLevel(raw: unknown): number {
  return typeof raw === "number" && Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0;
}

/** names of keys that differ by language; the rest is named by the code itself */
export interface KeyNames {
  ControlLeft: string;
  ControlRight: string;
  ShiftLeft: string;
  ShiftRight: string;
  AltLeft: string;
  AltRight: string;
  MetaLeft: string;
  MetaRight: string;
  Space: string;
  Enter: string;
  Pause: string;
  ScrollLock: string;
  CapsLock: string;
  MouseBack: string;
  MouseForward: string;
  MouseMiddle: string;
}

/** a readable name for one key code: "Right Ctrl", "A", "F8", "Numpad 4" */
export function keyName(code: string, names: KeyNames): string {
  if (code in names) return names[code as keyof KeyNames];
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter?.[1]) return letter[1];
  const digit = /^Digit(\d)$/.exec(code);
  if (digit?.[1]) return digit[1];
  const pad = /^Numpad(\w+)$/.exec(code);
  if (pad) return `Numpad ${pad[1]}`;
  const arrows: Record<string, string> = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
  return arrows[code] ?? code;
}

/** the bound key as the user reads it: "Right Ctrl", "Ctrl + Space"; Mumble's label when the codes are unknown */
export function keyText(key: Pick<PttKey, "codes" | "label">, names: KeyNames): string {
  return key.codes.length > 0 ? key.codes.map((c) => keyName(c, names)).join(" + ") : key.label;
}

/** the page's name for a mouse button (DOM button index), only the ones a person would bind to talk */
export function mouseCode(button: number): string | null {
  return button === 1 ? "MouseMiddle" : button === 3 ? "MouseBack" : button === 4 ? "MouseForward" : null;
}

/**
 * The page's own listening for the key while it only works in the window: which bound buttons are down. All of them
 * down means talking (a combination like Ctrl + Space), any of them up means silent again.
 */
export class KeyWatch {
  private down = new Set<string>();

  constructor(private readonly codes: readonly string[]) {}

  /** a key or mouse button went down or up; returns whether the whole key is held now */
  update(code: string, isDown: boolean): boolean {
    if (!this.codes.includes(code)) return this.held;
    if (isDown) this.down.add(code);
    else this.down.delete(code);
    return this.held;
  }

  /** the window lost the focus: its key-ups never arrive, so nothing counts as held */
  reset(): boolean {
    this.down.clear();
    return false;
  }

  get held(): boolean {
    return this.codes.length > 0 && this.codes.every((c) => this.down.has(c));
  }
}

/**
 * Ruumble Desk (ADR-0024): when the web UI runs inside the Ruumble Desk client, the client offers an object "desk"
 * over Qt's WebChannel (contract in the fork's src/mumble/ruumble/DeskChannel.h). Through it the web UI shows the
 * Mumble log and channel chat and opens the client's settings and server dialogs, so the client needs no window
 * chrome of its own. In a normal browser nothing of this exists and `available` stays false.
 */
import { mergeEntries, outgoing, parseEntry, unreadCount, type DeskEntry } from "./model.ts";

/** the client's object as QWebChannel hands it over: results arrive in callbacks */
interface DeskObject {
  version: string;
  server: string;
  history(callback: (entries: unknown[]) => void): void;
  sendMessage(text: string, callback: (ok: boolean) => void): void;
  openSettings(): void;
  openConnect(): void;
  openAudioWizard(): void;
  disconnectServer(): void;
  showMenu(x: number, y: number): void;
  logged: { connect(handler: (entry: unknown) => void): void };
  serverChanged: { connect(handler: () => void): void };
}

interface QtWindow {
  qt?: { webChannelTransport?: unknown };
  QWebChannel?: new (transport: unknown, ready: (channel: { objects: { desk?: DeskObject } }) => void) => unknown;
}

export class DeskState {
  available = $state(false);
  open = $state(false);
  entries = $state<DeskEntry[]>([]);
  server = $state("");
  version = $state("");
  draft = $state("");
  sending = $state(false);
  private seenId = $state(0);
  private desk: DeskObject | null = null;

  readonly unread = $derived(this.open ? 0 : unreadCount(this.entries, this.seenId));

  /** looks for the client; does nothing in a normal browser */
  start(win: QtWindow = window as unknown as QtWindow): void {
    const transport = win.qt?.webChannelTransport;
    if (!transport || !win.QWebChannel) return;
    new win.QWebChannel(transport, (channel) => {
      const desk = channel.objects.desk;
      if (!desk) return;
      this.desk = desk;
      this.available = true;
      this.version = desk.version;
      this.server = desk.server;
      desk.serverChanged.connect(() => (this.server = desk.server));
      desk.logged.connect((raw) => this.add([raw]));
      desk.history((list) => this.add(list));
    });
  }

  private add(raw: unknown[]): void {
    const parsed = raw.map(parseEntry).filter((e): e is DeskEntry => e !== null);
    if (parsed.length === 0) return;
    this.entries = mergeEntries(this.entries, parsed);
    if (this.open) this.markSeen();
  }

  private markSeen(): void {
    this.seenId = this.entries.at(-1)?.id ?? this.seenId;
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) this.markSeen();
  }

  close(): void {
    this.open = false;
  }

  /** the draft as a message to the own channel, like Mumble's chat bar */
  send(): void {
    const text = outgoing(this.draft);
    if (!text || !this.desk || this.sending) return;
    this.sending = true;
    this.desk.sendMessage(text, (ok) => {
      this.sending = false;
      if (ok) this.draft = "";
    });
  }

  openSettings(): void {
    this.desk?.openSettings();
  }

  openConnect(): void {
    this.desk?.openConnect();
  }

  openAudioWizard(): void {
    this.desk?.openAudioWizard();
  }

  disconnect(): void {
    this.desk?.disconnectServer();
  }

  /** Mumble's own menus (server manager, self, configure, help, user list) as a native popup at x/y of the page */
  showMenu(x: number, y: number): void {
    this.desk?.showMenu(Math.round(x), Math.round(y));
  }

  /** the menu below an element, aligned to its left edge */
  showMenuAt(el: Element): void {
    const r = el.getBoundingClientRect();
    this.showMenu(r.left, r.bottom);
  }
}

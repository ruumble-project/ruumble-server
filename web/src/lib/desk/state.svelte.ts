/**
 * Ruumble Client (ADR-0024): when the web UI runs inside the Ruumble Client, the client offers an object "desk"
 * over Qt's WebChannel (contract in the fork's src/mumble/ruumble/DeskChannel.h). Through it the web UI shows the
 * Mumble log and channel chat and opens the client's settings and server dialogs, so the client needs no window
 * chrome of its own. In a normal browser nothing of this exists and `available` stays false.
 */
import type { DeskAdmin } from "./admin.ts";
import {
  firstUnreadId, mergeEntries, outgoing, parseEntry, parseFilter, unreadCount, visibleEntries, type DeskEntry, type DeskFilter,
} from "./model.ts";

const FILTER_KEY = "ruumble.deskFilter";

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
  showChannelMenu?(channelId: number, x: number, y: number): void;
  showUserMenu?(session: number, x: number, y: number): void;
  moveUser?(session: number, channelId: number): void;
  logged: { connect(handler: (entry: unknown) => void): void };
  serverChanged: { connect(handler: () => void): void };
}

interface QtWindow {
  qt?: { webChannelTransport?: unknown };
  QWebChannel?: new (transport: unknown, ready: (channel: { objects: { desk?: DeskObject } }) => void) => unknown;
}

export class DeskState implements DeskAdmin {
  available = $state(false);
  open = $state(false);
  entries = $state<DeskEntry[]>([]);
  draft = $state("");
  sending = $state(false);
  /** search text and filter of the box; the filter is remembered in this browser, the search is not */
  query = $state("");
  filter = $state<DeskFilter>(readFilter());
  /** the first message that was unread when the box was opened: the "New" line stands above it */
  newFrom = $state<number | null>(null);
  private seenId = $state(0);
  private desk: DeskObject | null = null;

  readonly unread = $derived(this.open ? 0 : unreadCount(this.entries, this.seenId));
  readonly visible = $derived(visibleEntries(this.entries, this.query, this.filter));

  /** looks for the client; does nothing in a normal browser */
  start(win: QtWindow = window as unknown as QtWindow): void {
    const transport = win.qt?.webChannelTransport;
    if (!transport || !win.QWebChannel) return;
    new win.QWebChannel(transport, (channel) => {
      const desk = channel.objects.desk;
      if (!desk) return;
      this.desk = desk;
      this.available = true;
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

  /** the room tab of Ruumble in a box came into view (it marks where the unread start) or went out of it (#10) */
  setVisible(visible: boolean): void {
    if (visible === this.open) return;
    this.open = visible;
    if (visible) {
      this.newFrom = firstUnreadId(this.entries, this.seenId);
      this.markSeen();
    }
  }

  setFilter(filter: DeskFilter): void {
    this.filter = filter;
    try {
      localStorage.setItem(FILTER_KEY, filter);
    } catch {
      // private mode or similar: then only applies until reload
    }
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

  /** Mumble's context menu for a channel at x/y of the page (lib/desk/admin.ts); clients before it have none */
  channelMenu(channelId: number, x: number, y: number): void {
    this.desk?.showChannelMenu?.(channelId, Math.round(x), Math.round(y));
  }

  /** Mumble's context menu for a user at x/y of the page */
  userMenu(session: number, x: number, y: number): void {
    this.desk?.showUserMenu?.(session, Math.round(x), Math.round(y));
  }

  /** a person dropped onto a room: moved there with the user's own Mumble permissions */
  moveUser(session: number, channelId: number): void {
    this.desk?.moveUser?.(session, channelId);
  }

  /** the menu below an element, aligned to its left edge */
  showMenuAt(el: Element): void {
    const r = el.getBoundingClientRect();
    this.showMenu(r.left, r.bottom);
  }
}

function readFilter(): DeskFilter {
  try {
    return parseFilter(localStorage.getItem(FILTER_KEY));
  } catch {
    return "all";
  }
}

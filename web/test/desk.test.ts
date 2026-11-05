// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  DESK_MAX_ENTRIES, firstUnreadId, mergeEntries, outgoing, parseEntry, parseFilter, timeOf, unreadCount, visibleEntries, type DeskEntry,
} from "../src/lib/desk/model.ts";
import { DeskState } from "../src/lib/desk/state.svelte.ts";
import { carriesPerson, contextMenu, droppedSession, SESSION_DRAG, type DeskAdmin } from "../src/lib/desk/admin.ts";
import { de } from "../src/lib/i18n/de.ts";
import { en } from "../src/lib/i18n/en.ts";

const entry = (id: number, kind: DeskEntry["kind"] = "info", text = `line ${id}`): DeskEntry => ({ id, time: 1000 * id, kind, text });

describe("Ruumble Client: the Mumble log in the web UI (ADR-0024)", () => {
  it("takes only well-formed entries from the client; an unknown kind counts as info", () => {
    expect(parseEntry({ id: 1, time: 5, kind: "text", text: "Ben: hi" })).toEqual({ id: 1, time: 5, kind: "text", text: "Ben: hi" });
    expect(parseEntry({ id: 2, time: 5, kind: "shout", text: "x" })?.kind).toBe("info");
    expect(parseEntry({ id: "3", time: 5, text: "x" })).toBeNull();
    expect(parseEntry({ id: 3, time: 5 })).toBeNull();
    expect(parseEntry(null)).toBeNull();
    expect(parseEntry("text")).toBeNull();
  });

  it("history and live entries overlap: merged by id, in order, without duplicates and capped", () => {
    expect(mergeEntries([entry(1), entry(3)], [entry(2), entry(3)]).map((e) => e.id)).toEqual([1, 2, 3]);
    const many = Array.from({ length: DESK_MAX_ENTRIES + 5 }, (_, i) => entry(i + 1));
    const merged = mergeEntries([], many);
    expect(merged).toHaveLength(DESK_MAX_ENTRIES);
    expect(merged[0]!.id).toBe(6);
    expect(mergeEntries([entry(1)], [entry(2)], 1).map((e) => e.id)).toEqual([2]);
  });

  it("counts only messages from others after the last one seen", () => {
    const entries = [entry(1, "text"), entry(2, "own"), entry(3, "private"), entry(4, "info"), entry(5, "warning"), entry(6, "text")];
    expect(unreadCount(entries, 0)).toBe(3);
    expect(unreadCount(entries, 3)).toBe(1);
    expect(unreadCount(entries, 6)).toBe(0);
  });

  it("formats the time and trims what is sent", () => {
    expect(timeOf(new Date(2026, 10, 3, 9, 41).getTime(), "de-DE")).toBe("09:41");
    expect(outgoing("  hello \n")).toBe("hello");
    expect(outgoing("   ")).toBe("");
  });

  it("search and filter: text anywhere ignoring case, messages or notices, both together", () => {
    const entries = [
      entry(1, "info", "Welcome to Acme"), entry(2, "text", "Ben: Coffee?"), entry(3, "own", "Me: coffee, yes"),
      entry(4, "private", "Ben: psst"), entry(5, "warning", "Server is restarting"), entry(6, "text", "Clara: build is green"),
    ];
    const ids = (q: string, f: Parameters<typeof visibleEntries>[2]) => visibleEntries(entries, q, f).map((e) => e.id);
    expect(ids("", "all")).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ids("  ", "all")).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ids("COFFEE", "all")).toEqual([2, 3]);
    expect(ids("", "messages")).toEqual([2, 3, 4, 6]);
    expect(ids("", "notices")).toEqual([1, 5]);
    expect(ids("ben", "messages")).toEqual([2, 4]);
    expect(ids("ben", "notices")).toEqual([]);
  });

  it("takes only a known filter from storage", () => {
    expect(parseFilter("messages")).toBe("messages");
    expect(parseFilter("notices")).toBe("notices");
    expect(parseFilter("shouting")).toBe("all");
    expect(parseFilter(null)).toBe("all");
  });

  it("the New line stands above the first message from others after the last one seen", () => {
    const entries = [entry(1, "text"), entry(2, "info"), entry(3, "own"), entry(4, "private"), entry(5, "text")];
    expect(firstUnreadId(entries, 0)).toBe(1);
    expect(firstUnreadId(entries, 1)).toBe(4);
    expect(firstUnreadId(entries, 4)).toBe(5);
    expect(firstUnreadId(entries, 5)).toBeNull();
    expect(firstUnreadId([entry(1, "info"), entry(2, "own")], 0)).toBeNull();
  });

  it("has texts in both languages", () => {
    expect(de.desk.messageTo("Küche")).toBe("Nachricht an Küche");
    expect(en.desk.messageTo("Kitchen")).toBe("Message to Kitchen");
    expect([de.desk.unread(1), de.desk.unread(3)]).toEqual(["1 neue Nachricht", "3 neue Nachrichten"]);
    expect([en.desk.unread(1), en.desk.unread(3)]).toEqual(["1 new message", "3 new messages"]);
    expect([de.desk.title, en.desk.title]).toEqual(["Ruumble in a box", "Ruumble in a box"]);
    expect([de.desk.filters.messages, en.desk.filters.notices]).toEqual(["Nachrichten", "Notices"]);
    expect(de.screens.deskOfflineText("Acme")).toBe("Verbinde Ruumble Client mit dem Server Acme.");
    expect(en.screens.deskOfflineText("Acme")).toBe("Connect Ruumble Client to the server Acme.");
  });
});

/** a client as QWebChannel would hand it over */
function fakeClient(history: unknown[] = []) {
  const calls: string[] = [];
  const sent: string[] = [];
  let onLogged: (e: unknown) => void = () => {};
  let onServer: () => void = () => {};
  let sendResult = true;
  const desk = {
    version: "1.6.0",
    server: "127.0.0.1:64738",
    history: (cb: (entries: unknown[]) => void) => cb(history),
    sendMessage: (text: string, cb: (ok: boolean) => void) => {
      sent.push(text);
      cb(sendResult);
    },
    openSettings: () => calls.push("settings"),
    openConnect: () => calls.push("connect"),
    openAudioWizard: () => calls.push("audio"),
    disconnectServer: () => calls.push("disconnect"),
    showMenu: (x: number, y: number) => calls.push(`menu ${x},${y}`),
    showChannelMenu: (id: number, x: number, y: number) => calls.push(`channel ${id} ${x},${y}`),
    showUserMenu: (session: number, x: number, y: number) => calls.push(`user ${session} ${x},${y}`),
    moveUser: (session: number, channel: number) => calls.push(`move ${session} to ${channel}`),
    logged: { connect: (h: (e: unknown) => void) => (onLogged = h) },
    serverChanged: { connect: (h: () => void) => (onServer = h) },
  };
  const win = {
    qt: { webChannelTransport: {} },
    QWebChannel: class {
      constructor(_t: unknown, ready: (c: { objects: { desk?: typeof desk } }) => void) {
        ready({ objects: { desk } });
      }
    },
  };
  return {
    win, desk, calls, sent,
    log: (e: unknown) => onLogged(e),
    serverChange: (s: string) => { desk.server = s; onServer(); },
    failSends: () => (sendResult = false),
  };
}

describe("Ruumble Client: the connection to the client", () => {
  it("stays unavailable in a normal browser", () => {
    const desk = new DeskState();
    desk.start({});
    desk.start({ qt: {} });
    expect(desk.available).toBe(false);
    desk.send(); // nothing to send to: no error
    desk.openSettings();
  });

  it("stays unavailable when the client offers no desk object", () => {
    const desk = new DeskState();
    desk.start({ qt: { webChannelTransport: {} }, QWebChannel: class { constructor(_t: unknown, ready: (c: { objects: object }) => void) { ready({ objects: {} }); } } });
    expect(desk.available).toBe(false);
  });

  it("loads the history, follows the log and counts unread messages while closed", () => {
    const client = fakeClient([{ id: 1, time: 1, kind: "info", text: "Welcome" }, { id: 2, time: 2, kind: "text", text: "Ben: hi" }]);
    const desk = new DeskState();
    desk.start(client.win);
    expect(desk.available).toBe(true);
    expect(desk.version).toBe("1.6.0");
    expect(desk.server).toBe("127.0.0.1:64738");
    expect(desk.entries.map((e) => e.id)).toEqual([1, 2]);
    expect(desk.unread).toBe(1);

    desk.toggle(); // open: everything seen
    expect(desk.unread).toBe(0);
    client.log({ id: 3, time: 3, kind: "text", text: "Ben: still there?" });
    desk.close();
    expect(desk.unread).toBe(0); // arrived while open
    client.log({ id: 4, time: 4, kind: "private", text: "Ben: psst" });
    client.log({ broken: true });
    expect(desk.entries).toHaveLength(4);
    expect(desk.unread).toBe(1);

    client.serverChange("");
    expect(desk.server).toBe("");
  });

  it("on opening marks where the unread messages start; the filter is remembered, the search is not", () => {
    localStorage.removeItem("ruumble.deskFilter");
    const client = fakeClient([{ id: 1, time: 1, kind: "text", text: "Ben: hi" }]);
    const desk = new DeskState();
    desk.start(client.win);
    desk.toggle();
    expect(desk.newFrom).toBe(1);
    desk.close();
    client.log({ id: 2, time: 2, kind: "info", text: "Clara entered" });
    client.log({ id: 3, time: 3, kind: "text", text: "Clara: morning" });
    desk.toggle();
    expect(desk.newFrom).toBe(3);
    desk.close();
    desk.toggle(); // nothing unread any more: no line
    expect(desk.newFrom).toBeNull();

    desk.query = "clara";
    desk.setFilter("messages");
    expect(desk.visible.map((e) => e.id)).toEqual([3]);
    expect(localStorage.getItem("ruumble.deskFilter")).toBe("messages");
    const again = new DeskState();
    expect(again.filter).toBe("messages");
    expect(again.query).toBe("");
    localStorage.removeItem("ruumble.deskFilter");
  });

  it("sends the trimmed draft and clears it only when the client took it", () => {
    const client = fakeClient();
    const desk = new DeskState();
    desk.start(client.win);
    desk.draft = "   ";
    desk.send();
    expect(client.sent).toEqual([]);
    desk.draft = " Hello room ";
    desk.send();
    expect(client.sent).toEqual(["Hello room"]);
    expect(desk.draft).toBe("");
    expect(desk.sending).toBe(false);
    client.failSends();
    desk.draft = "again";
    desk.send();
    expect(desk.draft).toBe("again");
  });

  it("opens the client's dialogs", () => {
    const client = fakeClient();
    const desk = new DeskState();
    desk.start(client.win);
    desk.openConnect();
    desk.openAudioWizard();
    desk.openSettings();
    desk.disconnect();
    desk.showMenu(10.4, 20.6);
    const el = document.createElement("button");
    el.getBoundingClientRect = () => ({ left: 5, bottom: 30 }) as DOMRect;
    desk.showMenuAt(el);
    expect(client.calls).toEqual(["connect", "audio", "settings", "disconnect", "menu 10,21", "menu 5,30"]);
  });
});

describe("Ruumble Client: administering the building like in Mumble", () => {
  const admin = (available = true) => {
    const calls: string[] = [];
    const a: DeskAdmin = {
      available,
      channelMenu: (id, x, y) => calls.push(`channel ${id} ${x},${y}`),
      userMenu: (session, x, y) => calls.push(`user ${session} ${x},${y}`),
      moveUser: (session, channel) => calls.push(`move ${session} to ${channel}`),
    };
    return { a, calls };
  };
  const rightClick = (target: Element) => {
    const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 60 });
    Object.defineProperty(e, "target", { value: target });
    return e;
  };
  const room = () => {
    const el = document.createElement("button");
    el.innerHTML = '<span class="person" data-session="7"><span class="av">BE</span></span>';
    return el;
  };

  it("a right click opens the menu of the person under the pointer, otherwise that of the channel", () => {
    const { a, calls } = admin();
    const el = room();
    const onPerson = rightClick(el.querySelector(".av")!);
    expect(contextMenu(a, onPerson, 4)).toBe(true);
    expect(onPerson.defaultPrevented).toBe(true);
    const onRoom = rightClick(el);
    expect(contextMenu(a, onRoom, 4)).toBe(true);
    expect(contextMenu(a, rightClick(el), 0)).toBe(true); // the building (root channel)
    expect(calls).toEqual(["user 7 40,60", "channel 4 40,60", "channel 0 40,60"]);
  });

  it("leaves the browser's own menu alone outside Ruumble Client, or where there is no channel", () => {
    const { a, calls } = admin(false);
    const e = rightClick(room());
    expect(contextMenu(a, e, 4)).toBe(false);
    expect(e.defaultPrevented).toBe(false);
    expect(contextMenu(undefined, rightClick(room()), 4)).toBe(false);
    const other = admin();
    const empty = rightClick(document.createElement("div"));
    expect(contextMenu(other.a, empty, null)).toBe(false);
    expect(empty.defaultPrevented).toBe(false);
    expect([...calls, ...other.calls]).toEqual([]);
  });

  it("knows a dragged person by its type and reads the session only when dropped", () => {
    const drag = (data: Record<string, string>) => ({ dataTransfer: { types: Object.keys(data), getData: (k: string) => data[k] ?? "" } }) as unknown as DragEvent;
    expect(carriesPerson(drag({ [SESSION_DRAG]: "7" }))).toBe(true);
    expect(carriesPerson(drag({ Files: "" }))).toBe(false);
    expect(droppedSession(drag({ [SESSION_DRAG]: "7" }))).toBe(7);
    expect(droppedSession(drag({ [SESSION_DRAG]: "x" }))).toBeNull();
    expect(droppedSession(drag({ [SESSION_DRAG]: "0" }))).toBeNull();
    expect(droppedSession(drag({}))).toBeNull();
  });

  it("passes menus and moves on to the client, rounded; an older client without them is no error", () => {
    const client = fakeClient();
    const desk = new DeskState();
    desk.start(client.win);
    desk.channelMenu(4, 10.4, 20.6);
    desk.userMenu(7, 1, 2);
    desk.moveUser(7, 5);
    expect(client.calls).toEqual(["channel 4 10,21", "user 7 1,2", "move 7 to 5"]);
    const old = fakeClient();
    const olderObject = old.desk as Partial<typeof old.desk>;
    delete olderObject.showChannelMenu;
    delete olderObject.moveUser;
    const olderDesk = new DeskState();
    olderDesk.start(old.win);
    olderDesk.channelMenu(4, 1, 1);
    olderDesk.moveUser(7, 5);
    expect(old.calls).toEqual([]);
  });
});

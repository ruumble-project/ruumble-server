// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DESK_MAX_ENTRIES, mergeEntries, outgoing, parseEntry, timeOf, unreadCount, type DeskEntry } from "../src/lib/desk/model.ts";
import { DeskState } from "../src/lib/desk/state.svelte.ts";
import { de } from "../src/lib/i18n/de.ts";
import { en } from "../src/lib/i18n/en.ts";

const entry = (id: number, kind: DeskEntry["kind"] = "info", text = `line ${id}`): DeskEntry => ({ id, time: 1000 * id, kind, text });

describe("Ruumble Desk: the Mumble log in the web UI (ADR-0024)", () => {
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

  it("has texts in both languages", () => {
    expect(de.desk.messageTo("Küche")).toBe("Nachricht an Küche");
    expect(en.desk.messageTo("Kitchen")).toBe("Message to Kitchen");
    expect([de.desk.unread(1), de.desk.unread(3)]).toEqual(["1 neue Nachricht", "3 neue Nachrichten"]);
    expect([en.desk.unread(1), en.desk.unread(3)]).toEqual(["1 new message", "3 new messages"]);
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

describe("Ruumble Desk: the connection to the client", () => {
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

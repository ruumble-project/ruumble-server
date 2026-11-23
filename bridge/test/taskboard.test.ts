import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { EQUIPMENT_DEFAULTS, applyTaskAction as apply, type BridgeToPlugin, type BridgeToUi, type Snapshot, type TaskEvent, type TaskPerson, type TaskRequest } from "@ruumble/protocol";
import { Gate } from "../src/access.ts";
import { EquipmentBook, equipmentRoutes } from "../src/equipment.ts";
import { Hub, personIdOf } from "../src/hub.ts";
import { Pairing } from "../src/pairing.ts";
import { Poller } from "../src/poller.ts";
import { FORGOTTEN_AFTER_MS, TaskBook } from "../src/taskboard/book.ts";
import { forgottenText, taskText } from "../src/taskboard/notify.ts";
import { taskBoardRoutes } from "../src/taskboard/routes.ts";
import { FakeSource, recorder } from "./fake.ts";

const A = "a".repeat(40), B = "b".repeat(40), C = "c".repeat(40);
const anna: TaskPerson = { person: personIdOf(A), name: "Anna" };
const ben: TaskPerson = { person: personIdOf(B), name: "Ben" };
const cleo: TaskPerson = { person: personIdOf(C), name: "Cleo" };
const DAY = 24 * 60 * 60_000;

function request(over: Partial<TaskRequest> = {}): TaskRequest {
  return { id: "r1", channelId: 2, text: "Export times out", asker: ben, plus: [], state: "open", createdAt: 0, changedAt: 0, ...over };
}

describe("task board rules (#29)", () => {
  it("take: anyone but the asker, only while open; the helper's +1 goes", () => {
    expect(apply(request(), "take", ben, 5)).toBe("forbidden");
    const taken = apply(request({ plus: [anna, cleo] }), "take", anna, 5);
    expect(taken).toMatchObject({ kind: "taken", request: { state: "helping", helper: anna, plus: [cleo], changedAt: 5 } });
    expect(apply(request({ state: "helping", helper: cleo }), "take", anna, 5)).toBe("invalid"); // one helper
  });

  it("+1: not the asker or the helper, once, not when done; taking it back is quiet", () => {
    expect(apply(request(), "plus", ben, 1)).toBe("forbidden");
    expect(apply(request({ state: "helping", helper: anna }), "plus", anna, 1)).toBe("forbidden");
    expect(apply(request({ state: "done" }), "plus", anna, 1)).toBe("forbidden");
    const plussed = apply(request(), "plus", anna, 1);
    expect(plussed).toMatchObject({ kind: "plus", request: { plus: [anna] } });
    expect(apply(request({ plus: [anna] }), "plus", anna, 1)).toBe("invalid");
    expect(apply(request({ plus: [anna] }), "unplus", anna, 1)).toMatchObject({ kind: null, request: { plus: [] } });
    expect(apply(request(), "unplus", anna, 1)).toBe("invalid");
  });

  it("back and done: helper or asker, while helping", () => {
    const helping = request({ state: "helping", helper: anna });
    expect(apply(helping, "back", cleo, 2)).toBe("forbidden");
    const back = apply(helping, "back", ben, 2);
    expect(back).toMatchObject({ kind: "back", request: { state: "open" } });
    expect((back as { request: TaskRequest }).request.helper).toBeUndefined();
    expect(apply(request(), "back", ben, 2)).toBe("invalid");
    expect(apply(helping, "done", anna, 3)).toMatchObject({ kind: "done", request: { state: "done", helper: anna, doneAt: 3 } });
    expect(apply(helping, "done", ben, 3)).toMatchObject({ kind: "done" });
    expect(apply(helping, "done", cleo, 3)).toBe("forbidden");
    expect(apply(request(), "done", ben, 3)).toBe("invalid");
  });

  it("solved: only the asker, without a helper", () => {
    expect(apply(request(), "solved", anna, 4)).toBe("forbidden");
    const solved = apply(request({ state: "helping", helper: anna }), "solved", ben, 4) as { request: TaskRequest };
    expect(solved.request).toMatchObject({ state: "done", selfSolved: true, doneAt: 4 });
    expect(solved.request.helper).toBeUndefined();
    expect(apply(request({ state: "done" }), "solved", ben, 4)).toBe("invalid");
  });

  it("reopen: everyone involved, asker, helper and +1, only when done; the thanks stay", () => {
    const thanks = { motif: "coffee" as const, text: "Thanks", at: 1 };
    const done = request({ state: "done", helper: anna, plus: [cleo], doneAt: 3, thanks });
    for (const who of [ben, anna, cleo]) {
      const r = apply(done, "reopen", who, 9) as { kind: string; request: TaskRequest };
      expect(r.kind).toBe("reopened");
      expect(r.request).toMatchObject({ state: "open", thanks, changedAt: 9 });
      expect(r.request.helper).toBeUndefined();
      expect(r.request.doneAt).toBeUndefined();
    }
    const stranger = { person: "0".repeat(16), name: "Dan" };
    expect(apply(done, "reopen", stranger, 9)).toBe("forbidden");
    expect(apply(request(), "reopen", ben, 9)).toBe("invalid");
  });
});

describe("TaskBook (#29)", () => {
  it("ask, list newest first, summary of the open ones and the helpers", () => {
    let now = 100;
    const book = new TaskBook(null, { now: () => now });
    const one = book.ask(2, ben, { text: "  Export\n times out ", until: "14:00", talk: true }) as TaskRequest;
    expect(one).toMatchObject({ text: "Export times out", until: "14:00", talk: true, state: "open", plus: [] });
    expect(one.look).toBeUndefined();
    now = 200;
    const two = book.ask(2, anna, { text: "Proofread" }, cleo) as TaskRequest;
    expect(two.target).toEqual(cleo);
    book.ask(3, anna, { text: "Elsewhere" });
    expect(book.list(2).map((r) => r.id)).toEqual([two.id, one.id]);
    expect(book.summary(2)).toEqual({ open: 2, oldest: 100, newest: 200, asking: [ben.person, anna.person], helping: [] });
    book.act(one.id, "take", cleo);
    expect(book.summary(2)).toEqual({ open: 1, oldest: 200, newest: 200, asking: [anna.person], helping: [cleo.person] });
    expect(book.summary(9)).toEqual({ open: 0, oldest: null, newest: null, asking: [], helping: [] });
    expect(book.count(2)).toBe(2);
    expect(book.act("nope", "take", cleo)).toBe("not-found");
  });

  it("at most 50 unfinished requests per board", () => {
    const book = new TaskBook(null);
    for (let i = 0; i < 50; i++) expect(book.ask(2, ben, { text: `T${i}` })).not.toBe("invalid");
    expect(book.ask(2, ben, { text: "One too many" })).toBe("invalid");
    expect(book.ask(3, ben, { text: "Another board" })).not.toBe("invalid");
  });

  it("thanks: the asker, once done with a helper", () => {
    const book = new TaskBook(null, { now: () => 7 });
    const r = book.ask(2, ben, { text: "Help" }) as TaskRequest;
    expect(book.thank(r.id, ben, "rocket", "Wow")).toBe("invalid");
    book.act(r.id, "take", anna);
    book.act(r.id, "done", anna);
    expect(book.thank(r.id, anna, "rocket", "Wow")).toBe("forbidden");
    expect(book.thank(r.id, ben, "rocket", " You\nrock ")).toMatchObject({ thanks: { motif: "rocket", text: "You rock", at: 7 } });
    expect(book.thank("nope", ben, "rocket", "")).toBe("not-found");
  });

  it("prune clears done requests after the channel's days, clear empties a channel", () => {
    let now = 0;
    const changes: number[] = [];
    const book = new TaskBook(null, { now: () => now, onChange: () => changes.push(now) });
    const a = book.ask(2, ben, { text: "A" }) as TaskRequest;
    const b = book.ask(3, ben, { text: "B" }) as TaskRequest;
    book.ask(2, ben, { text: "Still open" });
    book.act(a.id, "solved", ben);
    book.act(b.id, "solved", ben);
    now = 2 * DAY;
    expect(book.prune((id) => (id === 2 ? 1 : 7))).toBe(1);
    expect(book.list(2).map((r) => r.text)).toEqual(["Still open"]);
    expect(book.prune(() => 7)).toBe(0);
    changes.length = 0;
    expect(book.clear(3)).toBe(1);
    expect(book.clear(3)).toBe(0);
    expect(changes).toHaveLength(1);
  });

  it("forgotten: helping for an hour and the helper gone, each request once", () => {
    let now = 0;
    const book = new TaskBook(null, { now: () => now });
    const r = book.ask(2, ben, { text: "Help" }) as TaskRequest;
    book.act(r.id, "take", anna);
    now = FORGOTTEN_AFTER_MS - 1;
    expect(book.forgotten(() => false)).toEqual([]);
    now = FORGOTTEN_AFTER_MS;
    expect(book.forgotten(() => true)).toEqual([]); // the helper is still around
    expect(book.forgotten(() => false).map((x) => x.id)).toEqual([r.id]);
    expect(book.forgotten(() => false)).toEqual([]);
  });

  it("is kept in the file and loaded again; broken entries are left out", () => {
    const file = join(mkdtempSync(join(tmpdir(), "ruumble-tasks-")), "taskboard.json");
    const one = new TaskBook(file, { now: () => 5 });
    const r = one.ask(2, ben, { text: "Help" }) as TaskRequest;
    one.act(r.id, "take", anna);
    const stored = JSON.parse(readFileSync(file, "utf8")) as unknown[];
    expect(stored).toHaveLength(1);
    const two = new TaskBook(file);
    expect(two.get(r.id)).toMatchObject({ state: "helping", helper: anna });
    expect(new TaskBook(join(file, "..", "missing.json")).list(2)).toEqual([]);
  });
});

describe("Mumble log lines (#29)", () => {
  const event = (over: Partial<TaskEvent> = {}): TaskEvent => ({
    kind: "asked", channelId: 2, room: "Office", requestId: "r1", by: ben, text: "Export times out", asker: ben, affected: 1, at: 0, ...over,
  });

  it("in German and English, for the room and for the person it is about", () => {
    expect(taskText(event())).toBe("Ben bittet an der Aufgabentafel um Hilfe: „Export times out“");
    expect(taskText(event(), "en")).toBe('Ben asks for help on the task board: "Export times out"');
    expect(taskText(event({ target: anna }), "de")).toContain("bittet Anna an der Aufgabentafel");
    expect(taskText(event({ target: anna }), "en", true)).toBe('Ben asks you for help on the task board of Office: "Export times out"');
    expect(taskText(event({ kind: "plus", by: anna, affected: 2 }))).toBe("Anna braucht das auch (2 betroffen): „Export times out“");
    expect(taskText(event({ kind: "taken", by: anna, helper: anna }))).toBe("Anna hilft Ben: „Export times out“");
    expect(taskText(event({ kind: "taken", by: anna, helper: anna }), "en", true)).toBe('Anna is helping you: "Export times out"');
    expect(taskText(event({ kind: "back" }), "en")).toBe("Ben's request is open again: \"Export times out\"");
    expect(taskText(event({ kind: "done", helper: anna }))).toBe("Erledigt: Anna hat Ben geholfen: „Export times out“");
    expect(taskText(event({ kind: "solved" }), "en")).toBe('Ben solved it: "Export times out"');
    expect(taskText(event({ kind: "reopened", by: cleo }))).toBe("Cleo hat die Bitte wieder geöffnet: „Export times out“");
    const thanks = event({ kind: "thanks", helper: anna, thanks: { motif: "coffee", text: "Coffee is on me", at: 1 } });
    expect(taskText(thanks)).toBe("Ben sagt Anna danke (Kaffee, „Coffee is on me“)");
    expect(taskText(thanks, "en", true)).toBe('Ben thanks you (coffee, "Coffee is on me") for: "Export times out"');
    expect(taskText(event({ kind: "thanks", helper: anna, thanks: { motif: "star", text: "", at: 1 } }), "en")).toBe("Ben thanks Anna (star)");
  });

  it("at most 300 characters", () => {
    expect(taskText(event({ text: "x".repeat(400) }))).toHaveLength(300);
    expect(forgottenText("Anna", "x".repeat(400), "Office")).toHaveLength(300);
    expect(forgottenText("Anna", "Help", "Office", "en")).toBe('Anna is helping you with "Help" but has left. Is it done? Have a look at the task board of Office.');
  });
});

describe("REST /api/equipment and /api/taskboard (#29)", () => {
  async function setup() {
    const source = new FakeSource();
    // Cleo (session 9) sits in the Office with Ben
    source.users.push({ ...source.users[1]!, session: 9, name: "Cleo", channel: 2, recording: false, address: "10.0.0.9" });
    source.hashes[9] = C;
    const pairing = new Pairing(null);
    let hub: Hub;
    const equipment = new EquipmentBook(null, () => hub.rebroadcast());
    const tasks = new TaskBook(null, { onChange: () => hub.rebroadcast() });
    hub = new Hub({
      source, pairing, addressCheck: "off", preview: false,
      equipment: () => equipment.all(),
      taskboards: () => equipment.withTaskBoard().map((channelId) => ({ channelId, summary: tasks.summary(channelId) })),
    });
    const poller = new Poller(source, { onChange: (s) => hub.setState(s) });
    await poller.poll();
    const plugins: Record<string, ReturnType<typeof recorder<BridgeToPlugin>>> = {};
    for (const [session, hash, locale] of [[7, A, "de"], [8, B, "en"], [9, C, "de"]] as const) {
      plugins[hash] = recorder<BridgeToPlugin>();
      await hub.pluginConnected(plugins[hash].conn, "x").onMessage(JSON.stringify({ v: 1, type: "hello", session, certHash: hash, pluginVersion: "0", paired: true, locale }));
    }
    poller.watchSessions([7, 8, 9]); // main.ts: onSessionsChanged
    await poller.poll();
    const cookie = Object.fromEntries([A, B, C].map((h, i) => [h, pairing.redeem(pairing.createCode(h, ["Anna", "Ben", "Cleo"][i]!))!]));
    const uis = Object.fromEntries([A, B, C].map((h) => [h, recorder<BridgeToUi>()]));
    for (const h of [A, B, C]) hub.uiConnected(uis[h]!.conn, h);
    const gate = new Gate({ hub, source, certHashOf: (c) => pairing.certHashOf(c) });
    const app = Fastify();
    await app.register(equipmentRoutes, { book: equipment, hub, gate });
    await app.register(taskBoardRoutes, { book: tasks, equipment, hub, gate });
    const as = (hash: string) => ({
      get: (url: string) => app.inject({ url, headers: { cookie: cookie[hash]! } }),
      post: (url: string, payload?: object) => app.inject({ method: "POST", url, headers: { cookie: cookie[hash]! }, ...(payload ? { payload } : {}) }),
      put: (url: string, payload: object) => app.inject({ method: "PUT", url, headers: { cookie: cookie[hash]! }, payload }),
      del: (url: string) => app.inject({ method: "DELETE", url, headers: { cookie: cookie[hash]! } }),
    });
    const lines = (hash: string) => plugins[hash]!.sent.flatMap((m) => (m.type === "notify" ? [m.text] : []));
    const events = (hash: string) => uis[hash]!.sent.flatMap((m) => (m.type === "taskboard" ? [m.event] : []));
    const snapshot = (hash: string) => uis[hash]!.last("snapshot") as Snapshot;
    return { app, source, equipment, tasks, as, lines, events, snapshot };
  }

  it("equipment: Write permission to change it, every snapshot carries it", async () => {
    const { app, source, as, snapshot } = await setup();
    const on = { ...EQUIPMENT_DEFAULTS, binders: false, taskboard: true };
    expect((await app.inject({ url: "/api/equipment/2" })).statusCode).toBe(401);
    expect((await as(B).get("/api/equipment/2")).json()).toEqual(EQUIPMENT_DEFAULTS);
    expect((await as(B).get("/api/equipment/0")).statusCode).toBe(404);
    expect((await as(B).put("/api/equipment/2", on)).statusCode).toBe(403);
    source.writeOn[8] = [2];
    expect((await as(B).put("/api/equipment/2", { ...on, waveMinutes: 7 })).statusCode).toBe(400);
    expect((await as(B).put("/api/equipment/2", on)).json()).toEqual(on);
    expect(snapshot(A).equipment).toEqual({ 2: on });
    expect((await as(B).put("/api/equipment/2", EQUIPMENT_DEFAULTS)).json()).toEqual(EQUIPMENT_DEFAULTS);
    expect(snapshot(A).equipment).toBeUndefined(); // back to the defaults: nothing kept
  });

  it("no task board: nothing to see or ask", async () => {
    const { as } = await setup();
    expect((await as(B).get("/api/taskboard/2")).statusCode).toBe(404);
    expect((await as(B).post("/api/taskboard/2", { text: "Help" })).statusCode).toBe(404);
  });

  it("ask from inside the room; everyone who may enter sees the plaque, the room's Mumble log the line", async () => {
    const { equipment, as, lines, events, snapshot } = await setup();
    equipment.set(2, { ...EQUIPMENT_DEFAULTS, taskboard: true });
    expect(snapshot(A).taskboards).toEqual({ 2: { open: 0, oldest: null, newest: null, asking: [], helping: [] } });
    // Anna stands in the corridor: she may help, not ask here
    expect((await as(A).post("/api/taskboard/2", { text: "Help" })).statusCode).toBe(403);
    expect((await as(B).post("/api/taskboard/2", { text: "  " })).statusCode).toBe(400);
    const res = await as(B).post("/api/taskboard/2", { text: "Export times out", look: true });
    expect(res.statusCode).toBe(200);
    const r = res.json() as TaskRequest;
    expect(r).toMatchObject({ asker: ben, look: true, state: "open" });
    expect(events(A).at(-1)).toMatchObject({ kind: "asked", room: "Office", by: ben, text: "Export times out" });
    expect(events(B).at(-1)?.kind).toBe("asked"); // also whoever did it
    expect(lines(C)).toEqual(["Ben bittet an der Aufgabentafel um Hilfe: „Export times out“"]);
    expect(lines(B)).toEqual([]);
    expect(lines(A)).toEqual([]); // not in the room
    expect(snapshot(A).taskboards?.[2]).toMatchObject({ open: 1, asking: [ben.person] });
    expect((await as(A).get("/api/taskboard/2")).json()).toMatchObject({ channelId: 2, name: "Office", requests: [{ id: r.id }] });
  });

  it("a channel the viewer may not enter: no summary, no access, no events", async () => {
    const { source, equipment, as, events, snapshot } = await setup();
    equipment.set(3, { ...EQUIPMENT_DEFAULTS, taskboard: true });
    expect(snapshot(A).taskboards).toBeUndefined(); // Anna may not enter the Secret room
    expect(snapshot(B).taskboards).toHaveProperty("3");
    expect((await as(A).get("/api/taskboard/3")).statusCode).toBe(403);
    source.users.find((u) => u.session === 8)!.channel = 3;
    equipment.set(2, { ...EQUIPMENT_DEFAULTS, taskboard: true }); // rebroadcast; the poller is not running
    expect(events(A)).toEqual([]);
  });

  it("a targeted request reaches the target in another room; take, done and thanks reach the people involved", async () => {
    const { equipment, as, lines, events } = await setup();
    equipment.set(2, { ...EQUIPMENT_DEFAULTS, taskboard: true });
    expect((await as(B).post("/api/taskboard/2", { text: "Help", target: personIdOf(B) })).statusCode).toBe(400);
    expect((await as(B).post("/api/taskboard/2", { text: "Help", target: "f".repeat(16) })).statusCode).toBe(404);
    const r = (await as(B).post("/api/taskboard/2", { text: "Proofread my offer", target: anna.person })).json() as TaskRequest;
    expect(r.target).toEqual(anna);
    expect(lines(A)).toEqual(["Ben bittet dich an der Aufgabentafel von Office um Hilfe: „Proofread my offer“"]);
    expect(lines(C)).toEqual(["Ben bittet Anna an der Aufgabentafel um Hilfe: „Proofread my offer“"]);

    expect((await as(B).post(`/api/taskboard/requests/${r.id}/take`)).statusCode).toBe(403);
    expect((await as(A).post(`/api/taskboard/requests/${r.id}/fly`)).statusCode).toBe(400);
    expect((await as(A).post(`/api/taskboard/requests/nope/take`)).statusCode).toBe(404);
    expect((await as(A).post(`/api/taskboard/requests/${r.id}/take`)).json()).toMatchObject({ state: "helping", helper: anna });
    expect(lines(B).at(-1)).toBe('Anna is helping you: "Proofread my offer"'); // in the room, but it is about Ben
    expect(lines(C).at(-1)).toBe("Anna hilft Ben: „Proofread my offer“");

    expect((await as(A).post(`/api/taskboard/requests/${r.id}/done`)).json()).toMatchObject({ state: "done" });
    expect(events(C).at(-1)).toMatchObject({ kind: "done", helper: anna });
    expect((await as(A).put(`/api/taskboard/requests/${r.id}/thanks`, { motif: "cake", text: "Yay" })).statusCode).toBe(403);
    expect((await as(B).put(`/api/taskboard/requests/${r.id}/thanks`, { motif: "pizza", text: "Yay" })).statusCode).toBe(400);
    expect((await as(B).put(`/api/taskboard/requests/${r.id}/thanks`, { motif: "cake", text: "Yay" })).json()).toMatchObject({ thanks: { motif: "cake", text: "Yay" } });
    expect(events(A).at(-1)).toMatchObject({ kind: "thanks", thanks: { motif: "cake" } });
    expect(lines(A).at(-1)).toBe("Ben sagt dir danke (Kuchen, „Yay“) für: „Proofread my offer“");
  });

  it("+1 and reopen by someone with +1; quiet unplus", async () => {
    const { equipment, as, events, lines } = await setup();
    equipment.set(2, { ...EQUIPMENT_DEFAULTS, taskboard: true });
    const r = (await as(B).post("/api/taskboard/2", { text: "VPN broken" })).json() as TaskRequest;
    expect((await as(C).post(`/api/taskboard/requests/${r.id}/plus`)).json()).toMatchObject({ plus: [cleo] });
    expect(events(A).at(-1)).toMatchObject({ kind: "plus", affected: 2 });
    const before = events(A).length;
    await as(C).post(`/api/taskboard/requests/${r.id}/unplus`);
    expect(events(A)).toHaveLength(before);
    await as(C).post(`/api/taskboard/requests/${r.id}/plus`);
    await as(B).post(`/api/taskboard/requests/${r.id}/solved`);
    expect((await as(A).post(`/api/taskboard/requests/${r.id}/reopen`)).statusCode).toBe(403);
    expect((await as(C).post(`/api/taskboard/requests/${r.id}/reopen`)).json()).toMatchObject({ state: "open" });
    expect(lines(B).at(-1)).toBe('Cleo reopened the request: "VPN broken"');
  });

  it("care: Write permission clears a room's requests", async () => {
    const { source, equipment, tasks, as } = await setup();
    equipment.set(2, { ...EQUIPMENT_DEFAULTS, taskboard: true });
    await as(B).post("/api/taskboard/2", { text: "Help" });
    expect((await as(B).del("/api/taskboard/2")).statusCode).toBe(403);
    expect((await as(B).del("/api/taskboard/0")).statusCode).toBe(404);
    source.writeOn[8] = [2];
    expect((await as(B).del("/api/taskboard/2")).json()).toEqual({ posts: 1 });
    expect(tasks.count(2)).toBe(0);
  });
});

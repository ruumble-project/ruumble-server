// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { EQUIPMENT_DEFAULTS, type Snapshot, type TaskBoardSummary, type TaskEvent, type TaskPerson, type TaskRequest } from "@ruumble/protocol";
import sample from "@ruumble/protocol/fixtures/sample.json";
import { MockAdapter, mockPersonId } from "../src/lib/adapter/mock.ts";
import { buildBuilding } from "../src/lib/model/building.ts";
import { boardLabel, boardLook, flagIsNew, equipmentOf, lanes, may, mayThank, mentionable, mentionQuery, names, noticeText, noticeTone, suggestThanks } from "../src/lib/taskboard/model.ts";
import { TaskBoardState } from "../src/lib/taskboard/state.svelte.ts";

const MIN = 60_000;
const anna: TaskPerson = { person: "00000000000000aa", name: "Anna" };
const ben: TaskPerson = { person: "00000000000000bb", name: "Ben" };
const cleo: TaskPerson = { person: "00000000000000cc", name: "Cleo" };

function request(over: Partial<TaskRequest> = {}): TaskRequest {
  return { id: "r", channelId: 3, text: "Help", asker: ben, plus: [], state: "open", createdAt: 0, changedAt: 0, ...over };
}
const summary = (over: Partial<TaskBoardSummary> = {}): TaskBoardSummary => ({ open: 0, oldest: null, newest: null, asking: [], helping: [], ...over });

describe("task board model (#29)", () => {
  it("the look of the graphic: empty, open, waiting long, only being helped", () => {
    expect(boardLook(summary(), 30, 0)).toBe("empty");
    expect(boardLook(summary({ open: 1, oldest: 0 }), 30, 29 * MIN)).toBe("open");
    expect(boardLook(summary({ open: 1, oldest: 0 }), 30, 30 * MIN)).toBe("waiting");
    expect(boardLook(summary({ helping: [anna.person] }), 30, 0)).toBe("helping");
    // the flag: red while the newest open request is younger than 2 hours, then green
    expect(flagIsNew(summary({ open: 2, oldest: 0, newest: 60 * MIN }), 179 * MIN)).toBe(true);
    expect(flagIsNew(summary({ open: 2, oldest: 0, newest: 60 * MIN }), 180 * MIN)).toBe(false);
    expect(flagIsNew(summary(), 0)).toBe(false);
    expect(boardLabel("Office", summary({ open: 2, oldest: 0 }), 5 * MIN)).toBe("Open the task board of Office · 2 requests waiting, the oldest 5 min ago");
    expect(boardLabel("Office", summary(), 0)).toBe("Open the task board of Office · No open request");
  });

  it("equipment: the defaults unless set up", () => {
    expect(equipmentOf(null, 3)).toEqual(EQUIPMENT_DEFAULTS);
    expect(equipmentOf({ equipment: { 3: { ...EQUIPMENT_DEFAULTS, taskboard: true } } }, 3).taskboard).toBe(true);
  });

  it("lanes: waiting longest first, the others newest first", () => {
    const list = [
      request({ id: "a", createdAt: 5 }), request({ id: "b", createdAt: 1 }),
      request({ id: "c", state: "helping", helper: anna, changedAt: 1 }), request({ id: "d", state: "helping", helper: anna, changedAt: 9 }),
      request({ id: "e", state: "done", doneAt: 1 }), request({ id: "f", state: "done", changedAt: 7 }),
    ];
    const l = lanes(list);
    expect([l.open, l.helping, l.done].map((x) => x.map((r) => r.id))).toEqual([["b", "a"], ["d", "c"], ["f", "e"]]);
  });

  it("buttons: the same rules as the service", () => {
    expect(may(request(), "take", anna)).toBe(true);
    expect(may(request(), "take", ben)).toBe(false);
    expect(may(request(), "take", null)).toBe(false);
    const done = request({ state: "done", helper: anna, plus: [cleo] });
    expect(may(done, "reopen", cleo)).toBe(true);
    expect(mayThank(done, ben)).toBe(true);
    expect(mayThank(done, anna)).toBe(false);
    expect(mayThank({ ...done, thanks: { motif: "star", text: "", at: 1 } }, ben)).toBe(false);
    expect(mayThank(request({ state: "done", selfSolved: true }), ben)).toBe(false);
    expect(mayThank(done, null)).toBe(false);
  });

  it("the plaque: text and colour of each event", () => {
    const e = (over: Partial<TaskEvent>): TaskEvent => ({ kind: "asked", channelId: 3, room: "Office", requestId: "r", by: ben, text: "Help", asker: ben, affected: 1, at: 0, ...over });
    expect(noticeText(e({}))).toBe("Ben asks for help: Help");
    expect(noticeText(e({ target: anna }))).toBe("Ben asks Anna: Help");
    expect(noticeText(e({ kind: "plus", by: cleo, affected: 2 }))).toBe("Cleo needs this too · 2 affected now");
    expect(noticeText(e({ kind: "taken", helper: anna }))).toBe("Anna is helping Ben");
    expect(noticeText(e({ kind: "back" }))).toBe("Ben's request is open again");
    expect(noticeText(e({ kind: "done", helper: anna }))).toBe("Anna helped Ben");
    expect(noticeText(e({ kind: "solved" }))).toBe("Ben solved it");
    expect(noticeText(e({ kind: "reopened", by: cleo }))).toBe("Cleo reopened the request: Help");
    expect(noticeText(e({ kind: "thanks", helper: anna }))).toBe("Ben thanks Anna");
    expect([noticeTone("asked"), noticeTone("taken"), noticeTone("thanks"), noticeTone("back")]).toEqual(["signal", "help", "done", "signal"]);
  });

  it("names, the dice and @", () => {
    expect([names([]), names(["Anna"]), names(["Anna", "Ben"]), names(["Anna", "Ben", "Cleo"])]).toEqual(["", "Anna", "Anna and Ben", "Anna, Ben and Cleo"]);
    expect(suggestThanks("coffee", "Coffee is on me!", () => 0)).toBe("I owe you a coffee.");
    expect(suggestThanks("coffee", "", () => 99)).toBe("Coffee is on me!");
    expect([mentionQuery("Help @Ke"), mentionQuery("@"), mentionQuery("mail@example"), mentionQuery("no at")]).toEqual(["Ke", "", null, null]);
    const snap = sample as unknown as Snapshot;
    const users = { ...snap, users: snap.users.map((u) => (u.ruumble ? { ...u, person: mockPersonId(u.name) } : u)) };
    expect(mentionable(users, 3, "").map((m) => m.name)).toEqual(["Clara", "Ben", "Eva", "Gregor"]); // Clara is in the room
    expect(mentionable(users, 3, "gre")).toEqual([{ person: mockPersonId("Gregor"), name: "Gregor", here: false }]);
    expect(mentionable(null, 3, "")).toEqual([]);
  });
});

describe("the building: task boards and marks (#29)", () => {
  it("a room with a task board the own user may enter; the binders off; marks at the people", () => {
    const snap = structuredClone(sample) as unknown as Snapshot;
    for (const u of snap.users) if (u.ruumble) u.person = mockPersonId(u.name);
    snap.equipment = { 3: { ...EQUIPMENT_DEFAULTS, taskboard: true, waveMinutes: 60 }, 4: { ...EQUIPMENT_DEFAULTS, binders: false } };
    snap.taskboards = { 3: summary({ open: 1, oldest: 5, asking: [mockPersonId("Clara")], helping: [mockPersonId("Ben"), mockPersonId("Clara")] }) };
    const b = buildBuilding(snap);
    const rooms = b.floors.flatMap((f) => f.rooms);
    const talk = rooms.find((r) => r.channelId === 3)!;
    expect(talk.taskboard).toMatchObject({ open: 1, waveMinutes: 60 });
    expect(talk.bindersOff).toBeUndefined();
    expect(rooms.find((r) => r.channelId === 4)!.bindersOff).toBe(true);
    expect(rooms.find((r) => r.channelId === 5)!.taskboard).toBeUndefined();
    const people = rooms.flatMap((r) => r.users);
    expect(people.find((u) => u.name === "Clara")!.help).toBe("asking"); // asking wins over helping
    expect(people.find((u) => u.name === "Ben")!.help).toBe("helping");
    expect(people.find((u) => u.name === "Anna")!.help).toBeUndefined();
  });

  it("a summary without the task board in the equipment shows nothing", () => {
    const snap = structuredClone(sample) as unknown as Snapshot;
    snap.taskboards = { 3: summary() };
    expect(buildBuilding(snap).floors.flatMap((f) => f.rooms).find((r) => r.channelId === 3)!.taskboard).toBeUndefined();
  });
});

describe("TaskBoardState against the mock (#29)", () => {
  function setup() {
    const mock = new MockAdapter("sample", { talking: false, replies: false, confirmMs: 0 });
    const notices: string[] = [];
    let snapshot: Snapshot | null = null;
    const events: TaskEvent[] = [];
    const state = new TaskBoardState(mock, {
      notice: (text) => notices.push(text),
      me: () => ({ person: mockPersonId("Anna"), name: "Anna" }),
    });
    mock.start({
      snapshot: (s) => { snapshot = s; state.observe(s); }, talking: () => {}, status: () => {}, board: () => {}, nudge: () => {}, chat: () => {},
      parcel: () => {}, parcelPull: () => {}, parcelsMissing: () => {}, connection: () => {},
      taskboard: (e) => { events.push(e); state.receive(e); },
    });
    return { mock, state, notices, events, snap: () => snapshot! };
  }

  it("the sample building: boards with every state", () => {
    const { snap } = setup();
    const boards = snap().taskboards!;
    expect(Object.keys(boards).sort()).toEqual(["2", "3", "5", "6"]);
    expect(boards[3]).toMatchObject({ open: 0, helping: [mockPersonId("Ben")] });
    expect(boards[6]).toMatchObject({ open: 1, asking: [mockPersonId("Ben")] });
  });

  it("ask in the own room, take, done and thank; plaques queue per room", async () => {
    const { mock, state, events, notices } = setup();
    await state.open(3);
    expect(state.view?.requests).toHaveLength(2);
    expect(await state.ask({ text: "  Printer  jammed ", look: true })).toBe(true);
    const mine = state.view!.requests.find((r) => r.text === "Printer jammed")!;
    expect(mine).toMatchObject({ look: true, state: "open", asker: { name: "Anna" } });
    expect(events.at(-1)?.kind).toBe("asked");
    expect(state.notices[3]?.current.text).toBe("Anna asks for help: Printer jammed");
    mock.askForHelp();
    expect(state.notices[3]?.waiting).toHaveLength(1);
    state.expire(3, state.notices[3]!.current.key);
    expect(state.notices[3]?.current.text).toContain("asks for help");
    state.expire(3, state.notices[3]!.current.key);
    expect(state.notices[3]).toBeUndefined();
    // somebody else's request: Anna takes it on and closes it, the asker thanks
    const other = (await mock.taskboard.load(3)).ok ? state.view!.requests.find((r) => r.asker.name === "Clara")! : null;
    expect(await state.act(other!, "take")).toBe(false); // Ben helps already
    expect(notices.at(-1)).toBe("That did not work. Is the request still there?");
    expect(await state.act(mine, "take")).toBe(false); // own request
    expect(await state.act(mine, "solved")).toBe(true);
    expect(state.view!.requests.find((r) => r.id === mine.id)?.state).toBe("done");
    expect(await state.act(mine, "reopen")).toBe(true);
    state.close();
    expect(state.view).toBeNull();
  });

  it("asking from outside the room is refused; entering a room with open requests shows a plaque once", async () => {
    const { mock, state, notices } = setup();
    await state.open(6);
    expect(await state.ask({ text: "Help" })).toBe(false);
    expect(notices.at(-1)).toBe("You are no longer in this room.");
    await mock.command({ cmd: "join", channel: 6 });
    await new Promise((r) => setTimeout(r, 10));
    expect(state.notices[6]?.current.text).toMatch(/^1 request is waiting at the task board, the oldest /);
    state.expire(6, state.notices[6]!.current.key);
    await mock.command({ cmd: "join", channel: 3 });
    await mock.command({ cmd: "join", channel: 6 });
    await new Promise((r) => setTimeout(r, 10));
    expect(state.notices[6]).toBeUndefined(); // not again within the hour
  });

  it("equipment: Write permission, saved and in the snapshot", async () => {
    const { mock, snap } = setup();
    const r = await mock.equipment.save(4, { ...EQUIPMENT_DEFAULTS, binders: false });
    expect(r.ok).toBe(true);
    expect(snap().equipment?.[4]?.binders).toBe(false);
    expect((await mock.equipment.save(1, { ...EQUIPMENT_DEFAULTS, taskboard: true })).ok).toBe(true); // a floor (corridor)
    expect((await mock.equipment.save(0, EQUIPMENT_DEFAULTS)).ok).toBe(false);
    expect((await mock.taskboard.clear(3)).ok).toBe(true);
  });
});

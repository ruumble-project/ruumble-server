/**
 * Task board (#29) under /api/taskboard. Everything needs a paired person with a connected plugin (the asker and the
 * helper are named to everyone), a channel with the task board switched on, and Mumble's Enter permission on it.
 *
 *   GET    /api/taskboard/:channelId                   TaskBoardView
 *   POST   /api/taskboard/:channelId                   NewTaskRequest → TaskRequest (only from inside the room)
 *   POST   /api/taskboard/requests/:id/:action         TaskAction → TaskRequest
 *   PUT    /api/taskboard/requests/:id/thanks          NewThanks → TaskRequest (the asker, once done)
 *   DELETE /api/taskboard/:channelId                   every request of the channel (care: Write permission) → CareDone
 *
 * Every change goes to the web UIs of everyone who may enter the channel (the plaque on the room) and as a line to the
 * Mumble log of the people in the room, and of the people involved who are elsewhere.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { NewTaskRequest, NewThanks, PROTOCOL_VERSION, TASK_LIMITS, TaskAction, type Equipment, type TaskEvent, type TaskEventKind, type TaskPerson, type TaskRequest } from "@ruumble/protocol";
import { fail, RateLimiter, type Gate } from "../access.ts";
import { personIdOf, type Hub, type Viewer } from "../hub.ts";
import type { TaskBook } from "./book.ts";
import { taskText } from "./notify.ts";

export interface TaskBoardRouteOptions {
  book: TaskBook;
  equipment: { get(channelId: number): Equipment };
  hub: Pick<Hub, "isBoardRoom" | "isFloor" | "mayEnter" | "channelName" | "personById" | "pluginsIn" | "toUisMayEnter">;
  gate: Gate;
  now?: () => number;
}

export async function taskBoardRoutes(app: FastifyInstance, o: TaskBoardRouteOptions): Promise<void> {
  const writes = new RateLimiter(TASK_LIMITS.perMinute);
  const now = o.now ?? Date.now;
  const hasBoard = (id: number) => Number.isInteger(id) && id > 0 && (o.hub.isBoardRoom(id) || o.hub.isFloor(id)) && o.equipment.get(id).taskboard;
  const me = (viewer: Viewer): TaskPerson => ({ person: personIdOf(viewer.certHash), name: viewer.name });

  /** paired and connected, a channel with a task board the viewer may enter */
  function access(req: FastifyRequest, reply: FastifyReply, channelId: number): Viewer | null {
    const viewer = o.gate.viewer(req);
    const refusal = !viewer ? "not-paired" : !hasBoard(channelId) ? "no-board-here" : !o.hub.mayEnter(viewer.session, channelId) ? "forbidden" : null;
    if (refusal) {
      void fail(reply, refusal);
      return null;
    }
    return viewer;
  }

  function announce(kind: TaskEventKind, r: TaskRequest, viewer: Viewer): void {
    const event: TaskEvent = {
      kind,
      channelId: r.channelId,
      room: o.hub.channelName(r.channelId),
      requestId: r.id,
      by: me(viewer),
      text: r.text,
      asker: r.asker,
      ...(r.target ? { target: r.target } : {}),
      ...(r.helper ? { helper: r.helper } : {}),
      affected: 1 + r.plus.length,
      ...(kind === "thanks" && r.thanks ? { thanks: r.thanks } : {}),
      at: now(),
    };
    o.hub.toUisMayEnter(r.channelId, { v: PROTOCOL_VERSION, type: "taskboard", event });
    // the people in the room, except whoever did it
    const inRoom = o.hub.pluginsIn(r.channelId, viewer.certHash);
    for (const plugin of inRoom) plugin.send({ v: PROTOCOL_VERSION, type: "notify", text: taskText(event, plugin.locale) });
    // the people involved who are elsewhere: the target of a new request, the asker, the helper, those with +1
    const actor = personIdOf(viewer.certHash);
    const concerned: { person: string; forYou: boolean }[] =
      kind === "asked" ? (r.target ? [{ person: r.target.person, forYou: true }] : [])
      : kind === "plus" ? []
      : [
          { person: r.asker.person, forYou: kind === "taken" },
          ...(r.helper ? [{ person: r.helper.person, forYou: kind === "thanks" }] : []),
          ...(kind === "done" || kind === "solved" || kind === "reopened" ? r.plus.map((p) => ({ person: p.person, forYou: false })) : []),
        ];
    const told = new Set<string>([actor]);
    for (const c of concerned) {
      if (told.has(c.person)) continue;
      told.add(c.person);
      const person = o.hub.personById(c.person);
      if (!person || (person.channelId === r.channelId && !c.forYou)) continue; // in the room: has the room's line
      person.notify(taskText(event, person.locale, c.forYou));
    }
  }

  app.get("/api/taskboard/:channelId", async (req, reply) => {
    const id = Number((req.params as { channelId: string }).channelId);
    if (!access(req, reply, id)) return reply;
    return { channelId: id, name: o.hub.channelName(id), equipment: o.equipment.get(id), requests: o.book.list(id) };
  });

  app.post("/api/taskboard/:channelId", async (req, reply) => {
    const id = Number((req.params as { channelId: string }).channelId);
    const viewer = access(req, reply, id);
    if (!viewer) return reply;
    if (viewer.channelId !== id) return fail(reply, "not-in-room");
    const body = NewTaskRequest.safeParse(req.body);
    if (!body.success) return fail(reply, "invalid");
    const { target: targetId, ...input } = body.data;
    let target: TaskPerson | undefined;
    if (targetId) {
      if (targetId === personIdOf(viewer.certHash)) return fail(reply, "invalid");
      const person = o.hub.personById(targetId);
      if (!person) return fail(reply, "not-found");
      target = { person: person.personId, name: person.name };
    }
    if (writes.over(viewer.certHash)) return fail(reply, "rate-limited");
    const request = o.book.ask(id, me(viewer), input, target);
    if (request === "invalid") return fail(reply, "invalid");
    announce("asked", request, viewer);
    return request;
  });

  app.post("/api/taskboard/requests/:id/:action", async (req, reply) => {
    const params = req.params as { id: string; action: string };
    const existing = o.book.get(params.id);
    if (!existing) return o.gate.viewer(req) ? fail(reply, "not-found") : fail(reply, "not-paired");
    const viewer = access(req, reply, existing.channelId);
    if (!viewer) return reply;
    const action = TaskAction.safeParse(params.action);
    if (!action.success) return fail(reply, "invalid");
    if (writes.over(viewer.certHash)) return fail(reply, "rate-limited");
    const result = o.book.act(params.id, action.data, me(viewer));
    if (typeof result === "string") return fail(reply, result);
    if (result.kind) announce(result.kind, result.request, viewer);
    return result.request;
  });

  app.put("/api/taskboard/requests/:id/thanks", async (req, reply) => {
    const params = req.params as { id: string };
    const existing = o.book.get(params.id);
    if (!existing) return o.gate.viewer(req) ? fail(reply, "not-found") : fail(reply, "not-paired");
    const viewer = access(req, reply, existing.channelId);
    if (!viewer) return reply;
    const body = NewThanks.safeParse(req.body);
    if (!body.success) return fail(reply, "invalid");
    if (writes.over(viewer.certHash)) return fail(reply, "rate-limited");
    const result = o.book.thank(params.id, me(viewer), body.data.motif, body.data.text);
    if (typeof result === "string") return fail(reply, result);
    announce("thanks", result, viewer);
    return result;
  });

  app.delete("/api/taskboard/:channelId", async (req, reply) => {
    const id = Number((req.params as { channelId: string }).channelId);
    if (!Number.isInteger(id) || id <= 0 || !(o.hub.isBoardRoom(id) || o.hub.isFloor(id))) return o.gate.viewer(req) ? fail(reply, "no-board-here") : fail(reply, "not-paired");
    const writer = await o.gate.writer(req, id);
    if (writer === "not-paired" || writer === "forbidden") return fail(reply, writer);
    return { posts: o.book.clear(id) };
  });
}

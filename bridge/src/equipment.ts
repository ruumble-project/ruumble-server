/**
 * Room equipment (#29): what a room or corridor has besides its people. The board is always there; the binders (the
 * Mumble description) can be switched off and the task board on. Kept by the service per channel in
 * `equipment.json`, not in the Mumble description, so it needs neither Ruumble Client nor room in the description.
 * Only channels that differ from EQUIPMENT_DEFAULTS are stored. Every web UI gets the equipment in the snapshot.
 *
 *   GET /api/equipment/:channelId   Equipment of a room or floor (paired)
 *   PUT /api/equipment/:channelId   Equipment → the same (Mumble Write permission on the channel)
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { FastifyInstance } from "fastify";
import { EQUIPMENT_DEFAULTS, Equipment } from "@ruumble/protocol";
import { fail, RateLimiter, type Gate } from "./access.ts";
import type { Hub } from "./hub.ts";

const same = (a: Equipment, b: Equipment) => a.binders === b.binders && a.taskboard === b.taskboard && a.waveMinutes === b.waveMinutes && a.clearDays === b.clearDays;

export class EquipmentBook {
  private entries: Record<string, Equipment> = {};
  private readonly file: string | null;
  private readonly onChange: () => void;

  /** `file` null: in memory only (tests) */
  constructor(file: string | null, onChange: () => void = () => {}) {
    this.file = file;
    this.onChange = onChange;
    if (!file) return;
    try {
      const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
      for (const [key, value] of Object.entries(raw)) {
        const parsed = Equipment.safeParse(value);
        if (/^\d+$/.test(key) && parsed.success) this.entries[key] = parsed.data;
      }
    } catch {
      this.entries = {};
    }
  }

  get(channelId: number): Equipment {
    return this.entries[String(channelId)] ?? EQUIPMENT_DEFAULTS;
  }

  /** the channels that were set up, for the snapshot */
  all(): Record<string, Equipment> {
    return this.entries;
  }

  /** channels with a task board */
  withTaskBoard(): number[] {
    return Object.entries(this.entries).filter(([, e]) => e.taskboard).map(([key]) => Number(key));
  }

  set(channelId: number, equipment: Equipment): Equipment {
    const key = String(channelId);
    if (same(this.get(channelId), equipment)) return this.get(channelId);
    if (same(equipment, EQUIPMENT_DEFAULTS)) delete this.entries[key];
    else this.entries[key] = { ...equipment };
    this.save();
    this.onChange();
    return this.get(channelId);
  }

  private save(): void {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.entries, null, 2), { mode: 0o600 });
    renameSync(tmp, this.file);
  }
}

export interface EquipmentRouteOptions {
  book: EquipmentBook;
  hub: Pick<Hub, "isBoardRoom" | "isFloor">;
  gate: Gate;
  writesPerMinute?: number;
}

export async function equipmentRoutes(app: FastifyInstance, o: EquipmentRouteOptions): Promise<void> {
  const writes = new RateLimiter(o.writesPerMinute ?? 20);
  const channelOf = (params: unknown): number | null => {
    const id = Number((params as { channelId?: string }).channelId);
    return Number.isInteger(id) && id > 0 && (o.hub.isBoardRoom(id) || o.hub.isFloor(id)) ? id : null;
  };

  app.get("/api/equipment/:channelId", async (req, reply) => {
    if (!o.gate.certHash(req)) return fail(reply, "not-paired");
    const id = channelOf(req.params);
    if (id === null) return fail(reply, "no-board-here");
    return o.book.get(id);
  });

  app.put("/api/equipment/:channelId", async (req, reply) => {
    const id = channelOf(req.params);
    const writer = await o.gate.writer(req, id ?? 0);
    if (writer === "not-paired" || writer === "forbidden") return fail(reply, writer);
    if (id === null) return fail(reply, "no-board-here");
    const body = Equipment.safeParse(req.body);
    if (!body.success) return fail(reply, "invalid");
    if (writes.over(writer.certHash)) return fail(reply, "rate-limited");
    return o.book.set(id, body.data);
  });
}

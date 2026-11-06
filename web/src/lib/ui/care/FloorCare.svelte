<script lang="ts">
  import type { FloorCare } from "@ruumble/protocol";
  import { formatSize, relativeTime } from "../../board/model.ts";
  import { purgeDays } from "../../care/model.ts";
  import { inBuildingOrder, nameProblem } from "../../care/rooms.ts";
  import { t } from "../../i18n/index.svelte.ts";
  import type { RuumbleState } from "../../state.svelte.ts";
  import type { ConfirmRequest } from "./CareShell.svelte";
  import Icon from "./Icon.svelte";
  import OrphanList, { type OrphanItem } from "./OrphanList.svelte";

  // floor care: the rooms of the floor (a line opens room care where the viewer may tend it), moving a board here, rooms that are gone
  let { app, floor, ask, confirming }: { app: RuumbleState; floor: FloorCare; ask: (key: string, request: ConfirmRequest) => void; confirming: string | null } = $props();

  /** rooms whose care the viewer may open (Mumble Write, from the snapshot); the service checks again */
  const tendable = $derived(new Set(app.snapshot?.care ?? []));

  // the rooms in Mumble (client#12): only inside Ruumble Client, with Mumble Write (the server checks again)
  const manage = $derived(app.desk.canManageChannels);
  const canAdd = $derived(manage && tendable.has(floor.channelId));
  const order = $derived(app.building?.floors.find((f) => f.channelId === floor.channelId)?.rooms.map((r) => r.channelId) ?? []);
  const rooms = $derived(inBuildingOrder(floor.rooms, order));
  const channels = $derived(app.snapshot?.channels ?? []);
  /** the people in each room right now (the building, so also rooms without a board) */
  const visitors = $derived(new Map((app.building?.floors.find((f) => f.channelId === floor.channelId)?.rooms ?? []).map((r) => [r.channelId, r.users.length])));

  let newName = $state("");
  let adding = $state(false);
  const addProblem = $derived(newName.trim() ? nameProblem(newName, floor.channelId, channels) : null);

  async function add(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    if (!canAdd || !newName.trim() || addProblem || app.roomsBusy) return;
    adding = true;
    if (await app.addRoom(floor.channelId, newName)) newName = "";
    adding = false;
  }

  let renaming = $state<number | null>(null);
  let renameTo = $state("");
  const renameProblem = $derived(renaming === null ? null : nameProblem(renameTo, floor.channelId, channels, renaming));
  function startRename(r: FloorCare["rooms"][number]): void {
    renaming = r.channelId;
    renameTo = r.name;
  }
  async function saveRename(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const id = renaming;
    if (id === null || renameProblem || app.roomsBusy) return;
    const before = floor.rooms.find((r) => r.channelId === id)?.name;
    if (renameTo.trim() === before) return void (renaming = null);
    if (await app.renameRoom(id, renameTo)) renaming = null;
  }
  function renameKey(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      renaming = null;
    }
  }
  function focusOnMount(node: HTMLInputElement): void {
    node.focus();
    node.select();
  }

  /** arrows, and Alt+Up/Down on a room's line */
  function lineKey(e: KeyboardEvent, id: number): void {
    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown") || !manage || !tendable.has(id)) return;
    e.preventDefault();
    void app.moveRoom(floor.channelId, id, e.key === "ArrowUp" ? -1 : 1);
  }

  function remove(r: FloorCare["rooms"][number]): void {
    const c = t().care;
    ask("delete-room", {
      title: c.confirmDeleteTitle(r.name),
      detail: c.confirmDeleteDetail,
      tone: "danger",
      icon: "trash",
      cancelLabel: c.keepRoom,
      alternative: { label: c.removeRoom, run: () => app.deleteRoom(floor.channelId, r.channelId, r.name, false) },
      confirmLabel: c.deleteWithData,
      run: () => app.deleteRoom(floor.channelId, r.channelId, r.name, true),
      ...(r.posts ? { aside: { label: c.saveZipFirst, run: () => app.exportRoom(r.channelId) } } : {}),
    });
  }

  let from = $state("");
  let to = $state("");
  const source = $derived(floor.sources.find((s) => String(s.channelId) === from));
  const target = $derived(floor.rooms.find((r) => String(r.channelId) === to));

  function move(): void {
    if (!source || !target) return;
    const c = t().care;
    ask("move", {
      title: c.confirmMoveTitle(c.posts(source.posts), source.name, target.name),
      detail: c.confirmMoveDetail(target.name),
      confirmLabel: c.moveConfirm,
      tone: "neutral",
      run: async () => {
        if (await app.transferBoard(source.channelId, target.channelId)) from = to = "";
      },
    });
  }

  const orphans = $derived<OrphanItem[]>(
    floor.orphans.map((o) => {
      const c = t().care;
      const when = o.goneSince === null ? c.moved : c.purgeIn(purgeDays(o.goneSince, floor.graceDays));
      return { id: o.channelId, name: o.name || c.unnamedRoom(o.channelId), posts: o.posts, meta: [c.postsShort(o.posts), o.bytes ? formatSize(o.bytes) : "", when].filter(Boolean).join(" · ") };
    }),
  );

  function removeOrphans(items: OrphanItem[]): void {
    const c = t().care;
    const posts = items.reduce((n, i) => n + i.posts, 0);
    ask("orphans", {
      title: items.length === 1 ? c.confirmRemoveOne(items[0]!.name) : c.confirmRemoveRooms(items.length),
      detail: c.confirmRemoveDetail(c.posts(posts)),
      confirmLabel: c.removeForever,
      tone: "danger",
      run: () => app.removeOrphans(items.map((i) => i.id)),
    });
  }
</script>

<div class="columns" class:stacked={manage}>
  {#snippet cells(r: FloorCare["rooms"][number])}
    {@const people = visitors.get(r.channelId) ?? 0}
    <span class="num" class:empty={!people}>{people}<span class="sr"> {t().care.colVisitors}</span></span>
    {#if r.posts}
      <span class="num">{r.bytes ? formatSize(r.bytes) : "–"}</span>
      <span class="last" title={t().care.posts(r.posts)}>{r.newest === null ? "" : relativeTime(r.newest)}</span>
    {:else}
      <span class="num empty">{t().care.empty}</span><span></span>
    {/if}
  {/snippet}
  <section class:faded={!!confirming && confirming !== "delete-room"}>
    <h3>{t().care.floorRooms}</h3>
    {#if rooms.length}
      <div class="table">
        <div class="row head" class:manage aria-hidden="true">
          <span>{t().care.colDoor}</span><span class="num">{t().care.colVisitors}</span><span class="num">{t().care.colAttachments}</span><span>{t().care.colLast}</span><span></span>
        </div>
        <ul>
          {#each rooms as r, i (r.channelId)}
            {@const mine = manage && tendable.has(r.channelId)}
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <li class="row" class:manage onkeydown={(e) => lineKey(e, r.channelId)}>
              {#if renaming === r.channelId}
                <form class="rename" onsubmit={saveRename}>
                  <input type="text" bind:value={renameTo} maxlength="120" aria-label={t().care.rename(r.name)} aria-invalid={!!renameProblem} onkeydown={renameKey} use:focusOnMount />
                  <button type="submit" class="icon-btn" title={t().care.renameSave} aria-label={t().care.renameSave} disabled={!!renameProblem || app.roomsBusy}><Icon name="check" size={16} /></button>
                  <button type="button" class="icon-btn" title={t().care.renameCancel} aria-label={t().care.renameCancel} onclick={() => (renaming = null)}><Icon name="close" size={16} /></button>
                </form>
              {:else if tendable.has(r.channelId)}
                <button type="button" class="door link" title={t().care.roomPlant(r.name)} onclick={() => app.openCare({ kind: "room", channelId: r.channelId }, true)}>
                  <Icon name="door" size={14} color="var(--accent)" /><strong>{r.name}</strong><Icon name="next" size={14} color="var(--link)" />
                </button>
              {:else}
                <span class="door"><Icon name="door" size={14} color="var(--accent)" /><strong>{r.name}</strong></span>
              {/if}
              {@render cells(r)}
              {#if manage}
                <span class="actions">
                  {#if mine}
                    <button type="button" class="icon-btn" title={t().care.moveUp(r.name)} aria-label={t().care.moveUp(r.name)} aria-keyshortcuts="Alt+ArrowUp" disabled={i === 0 || app.roomsBusy} onclick={() => app.moveRoom(floor.channelId, r.channelId, -1)}><Icon name="up" size={16} /></button>
                    <button type="button" class="icon-btn" title={t().care.moveDown(r.name)} aria-label={t().care.moveDown(r.name)} aria-keyshortcuts="Alt+ArrowDown" disabled={i === rooms.length - 1 || app.roomsBusy} onclick={() => app.moveRoom(floor.channelId, r.channelId, 1)}><Icon name="down" size={16} /></button>
                    <button type="button" class="icon-btn" title={t().care.rename(r.name)} aria-label={t().care.rename(r.name)} disabled={app.roomsBusy} onclick={() => startRename(r)}><Icon name="pencil" size={16} /></button>
                    <button type="button" class="icon-btn danger" title={t().care.deleteRoom(r.name)} aria-label={t().care.deleteRoom(r.name)} disabled={app.roomsBusy} onclick={() => remove(r)}><Icon name="trash" size={16} /></button>
                  {/if}
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
      {#if renaming !== null && renameProblem}<p class="problem" role="alert">{renameProblem === "empty" ? t().care.nameEmpty : t().care.nameTaken}</p>{/if}
    {:else}
      <p class="small">{t().care.noRooms}</p>
    {/if}
    {#if canAdd}
      <form class="add" onsubmit={add}>
        <input type="text" bind:value={newName} maxlength="120" placeholder={t().care.newRoomName} aria-label={t().care.newRoomName} aria-invalid={!!addProblem} />
        <button type="submit" class="btn secondary" disabled={!newName.trim() || !!addProblem || app.roomsBusy} aria-busy={adding}><Icon name="plus" color="var(--accent)" />{t().care.addRoom}</button>
      </form>
      {#if addProblem}<p class="problem" role="alert">{addProblem === "empty" ? t().care.nameEmpty : t().care.nameTaken}</p>{/if}
    {/if}
    <p class="small">{t().care.roomsHint}{#if !manage} {t().care.roomsOnlyClient}{/if}</p>
  </section>

  <div class="side">
    {#if floor.rooms.length}
      <section class:faded={!!confirming && confirming !== "move"}>
        <h3>{t().care.move}</h3>
        {#if floor.sources.length}
          <div class="pick" class:row-pick={manage}>
            <label for="care-move-from">{t().care.moveFrom}</label>
            <select id="care-move-from" bind:value={from} disabled={app.careBusy}>
              <option value="">{t().care.chooseRoom}</option>
              {#each floor.sources as s (s.channelId)}<option value={String(s.channelId)}>{t().care.sourceOption(s.name, s.posts, s.floorName === floor.name ? "" : s.floorName, s.gone)}</option>{/each}
            </select>
            <label for="care-move-to">{t().care.moveTo}</label>
            <select id="care-move-to" bind:value={to} disabled={app.careBusy}>
              <option value="">{t().care.chooseRoom}</option>
              {#each floor.rooms.filter((r) => String(r.channelId) !== from) as r (r.channelId)}<option value={String(r.channelId)}>{r.name}</option>{/each}
            </select>
            <button type="button" class="btn primary" title={t().care.moveHint} disabled={app.careBusy || !source || !target || from === to} onclick={move}>{t().care.moveButton}</button>
          </div>
        {:else}
          <p class="small">{t().care.noSources}</p>
        {/if}
      </section>
    {/if}
    <div class:faded={!!confirming && confirming !== "orphans"}>
      <OrphanList title={t().care.gone} items={orphans} empty={t().care.noGoneRooms} busy={app.careBusy} onremove={removeOrphans} />
    </div>
  </div>
</div>

<style>
  .columns { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 24px; align-items: start; }
  .side { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
  .table { border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
  .columns.stacked { grid-template-columns: minmax(0, 1fr); }
  .row {
    display: grid; grid-template-columns: minmax(0, 1fr) 64px 64px 96px 0; gap: 8px; align-items: center; width: 100%;
    min-height: 42px; padding: 0 10px; border: 0; background: var(--paper); font: inherit; color: var(--ink); text-align: left;
  }
  ul { list-style: none; margin: 0; padding: 0; }
  li { border-top: 1px solid var(--line-soft); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .row.manage { grid-template-columns: minmax(0, 1fr) 64px 64px 96px 128px; }
  .door.link { border: 0; padding: 0; background: none; font: inherit; color: var(--ink); cursor: pointer; text-align: left; }
  .door.link:hover strong { text-decoration: underline; }
  .actions { display: flex; justify-content: flex-end; gap: 2px; }
  .icon-btn {
    width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid transparent; border-radius: 4px;
    background: none; color: var(--ink); cursor: pointer;
  }
  .icon-btn:hover:not(:disabled) { border-color: var(--control); background: var(--tint); }
  .icon-btn.danger { color: var(--danger); }
  .icon-btn:disabled { opacity: 0.35; cursor: default; }
  .icon-btn:focus-visible, .door.link:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 1px; }
  .rename { display: flex; align-items: center; gap: 4px; min-width: 0; }
  .rename input, .add input {
    flex: 1; min-width: 0; height: 32px; padding: 0 8px; border: 1px solid var(--control); border-radius: 4px; background: var(--paper); color: var(--ink); font: inherit;
  }
  .rename input[aria-invalid="true"], .add input[aria-invalid="true"] { border-color: var(--danger); }
  .add { display: flex; gap: 8px; margin-top: 12px; }
  .add input { height: 40px; }
  .problem { margin: 6px 0 0; font-size: 13px; font-weight: 700; color: var(--danger); }
  .head { min-height: 30px; background: var(--surface); font-size: 12px; color: var(--muted); cursor: default; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .door { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .door strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .last { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .empty { color: var(--disabled); font-size: 13px; }
  .pick { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px 12px; align-items: center; }
  .pick label { font-size: 13px; color: var(--muted); }
  select { height: 40px; padding: 0 8px; border: 1px solid var(--control); border-radius: 4px; background: var(--paper); color: var(--ink); font: inherit; min-width: 0; width: 100%; }
  .pick .btn { justify-content: center; grid-column: 2; }
  /* the whole width (Ruumble Client): From, To and the button in one line */
  .pick.row-pick { grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr) auto; }
  .pick.row-pick .btn { grid-column: auto; white-space: nowrap; }
</style>

<script lang="ts">
  import { countText, rowsWidth, splitRows, type Floor, type Room, type UserView } from "../model/building.ts";
  import type { ListenView } from "../state.svelte.ts";
  import SpaceButton from "./SpaceButton.svelte";
  import { t } from "../i18n/index.svelte.ts";

  let {
    floor,
    readonly = false,
    pendingChannel,
    talking,
    onjoin,
    boardOpen = false,
    boardUnseen = 0,
    ontoggleboard,
    ontend,
    onfurnish,
    onnudge,
    onchat,
    onparcel,
    ondropfile,
    onself,
    listenOf,
    ontogglelisten,
    onlistenvolume,
  }: {
    floor: Floor;
    readonly?: boolean;
    pendingChannel: number | null;
    talking: Record<number, boolean>;
    onjoin: (channelId: number) => void;
    boardOpen?: boolean;
    boardUnseen?: number;
    ontoggleboard?: () => void;
    /** open the care dialog of a room or floor (ADR-0014) */
    ontend?: (target: { kind: "room" | "floor"; channelId: number }) => void;
    /** open the room setup of a room (paint bucket); only where the room setup exists (Ruumble Client) */
    onfurnish?: (channelId: number) => void;
    /** nudge a deafened person in the own room (ADR-0020) */
    onnudge?: (user: UserView) => void;
    /** send someone a direct message (ADR-0021) */
    onchat?: (user: UserView) => void;
    /** send someone a file by tube mail (ADR-0022) */
    onparcel?: (user: UserView) => void;
    /** a file dropped on a room, the corridor or a person: tube mail to them */
    ondropfile?: (file: File, people: string[]) => void;
    /** a click on the own avatar: the own status (ADR-0018) */
    onself?: () => void;
    /** the door of a room for listening in (#19) */
    listenOf?: (room: Room) => ListenView;
    ontogglelisten?: (channelId: number) => void;
    onlistenvolume?: (channelId: number, db: number) => void;
  } = $props();
  const toggleListen = (channelId: number) => (ontogglelisten ? () => ontogglelisten(channelId) : undefined);
  const listenVolume = (channelId: number) => (onlistenvolume ? (db: number) => onlistenvolume(channelId, db) : undefined);
  const tendRoom = (channelId: number) => (ontend ? () => ontend({ kind: "room", channelId }) : undefined);
  const furnishRoom = (channelId: number) => (onfurnish ? () => onfurnish(channelId) : undefined);
  const tendFloor = $derived(ontend ? () => ontend({ kind: "floor", channelId: floor.channelId }) : undefined);

  const rows = $derived(splitRows(floor.rooms));
  // more than 3 rooms per row: the rows get wider than the view and only the floor plan scrolls sideways
  const width = $derived(rowsWidth(floor.rooms.length));

  let plan = $state<HTMLDivElement | null>(null);
  // own room out of view (other floor, room change, many rooms): bring it into view
  const selfRoom = $derived(floor.rooms.find((r) => r.isSelf)?.channelId ?? null);
  $effect(() => {
    if (selfRoom === null || !plan) return;
    plan.querySelector(`[data-channel="${selfRoom}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  // the corridor is as wide as all rooms: its plant and binders stay at the right edge of the view, not at its far end
  // (--corridor-end: how far the view's right edge is from the end of the floor plan)
  let corridorEnd = $state(0);
  function trackEnd(el: HTMLElement) {
    const update = () => (corridorEnd = Math.max(0, Math.round(el.scrollWidth - el.clientWidth - el.scrollLeft)));
    update();
    el.addEventListener("scroll", update, { passive: true });
    const resized = new ResizeObserver(update);
    resized.observe(el);
    if (el.firstElementChild) resized.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      resized.disconnect();
    };
  }

  // a mouse wheel scrolls the floor plan sideways when it is wider than the view
  function wheel(el: HTMLElement) {
    const onwheel = (e: WheelEvent) => {
      if (e.ctrlKey || el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onwheel, { passive: false });
    return () => el.removeEventListener("wheel", onwheel);
  }
</script>

<div class="floorplan" class:wide={width > 1} bind:this={plan} style:--corridor-end={`${corridorEnd}px`} {@attach wheel} {@attach trackEnd}>
  {#if floor.open}
    <SpaceButton
      space={floor.corridor}
      variant="open"
      title={floor.name}
      subtitle={t().floorPlan.openFloor(countText(floor.population))}
      pending={pendingChannel === floor.channelId}
      {talking}
      {readonly}
      {onjoin} {onnudge} {onchat} {onparcel} {ondropfile} {onself}
      ontend={tendFloor}
    />
  {:else}
    <div class="track" style:width={width > 1 ? `${width * 100}%` : undefined}>
      <div class="row top">
        {#each rows.top as room (room.channelId)}
          <SpaceButton space={room} variant="room" row="top" title={room.name} pending={pendingChannel === room.channelId} {talking} {readonly} {onjoin} {onnudge} {onchat} {onparcel} {ondropfile} {onself} {boardOpen} {boardUnseen} {ontoggleboard} ontend={tendRoom(room.channelId)} onfurnish={furnishRoom(room.channelId)} listen={listenOf?.(room)} ontogglelisten={toggleListen(room.channelId)} onlistenvolume={listenVolume(room.channelId)} />
        {/each}
      </div>
      <SpaceButton
        space={floor.corridor}
        variant="corridor"
        title={t().common.corridor}
        subtitle={t().floorPlan.corridorSubtitle(countText(floor.corridor.users.length))}
        pending={pendingChannel === floor.channelId}
        {talking}
        {readonly}
        {onjoin} {onnudge} {onchat} {onparcel} {ondropfile} {onself}
        ontend={tendFloor}
      />
      <div class="row bottom">
        {#each rows.bottom as room (room.channelId)}
          <SpaceButton space={room} variant="room" row="bottom" title={room.name} pending={pendingChannel === room.channelId} {talking} {readonly} {onjoin} {onnudge} {onchat} {onparcel} {ondropfile} {onself} {boardOpen} {boardUnseen} {ontoggleboard} ontend={tendRoom(room.channelId)} onfurnish={furnishRoom(room.channelId)} listen={listenOf?.(room)} ontogglelisten={toggleListen(room.channelId)} onlistenvolume={listenVolume(room.channelId)} />
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .floorplan { flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--wall); overflow-x: auto; overflow-y: hidden; }
  .floorplan.wide { scrollbar-color: var(--color-blue-300) var(--color-wall); }
  .track { flex: 1 0 auto; min-width: 100%; display: flex; flex-direction: column; gap: var(--wall); }
  .row { display: flex; gap: var(--wall); flex: 1 1 0; min-height: 0; }
  /* never lower than two rows of people (tokens.css) */
  .row.top { min-height: var(--room-min-top); }
  .row.bottom { min-height: var(--room-min-bottom); }
</style>

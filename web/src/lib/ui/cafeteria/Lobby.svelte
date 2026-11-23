<script lang="ts">
  // the lobby (#30): the root channel, the level below the floors. Its left part is free for now; at the top right is
  // the cafeteria, where everyone in the root channel sits, one per seat (model/cafeteria.ts). A double click on the
  // cafeteria goes there, like on a room; a click on the own avatar sets the own status.
  import { onActivateKey } from "../activate.ts";
  import { countText, type Floor } from "../../model/building.ts";
  import { cafeRect, CAFE_VIEW, fraction, seating } from "../../model/cafeteria.ts";
  import { t } from "../../i18n/index.svelte.ts";
  import Avatar from "../Avatar.svelte";
  import Plant from "../Plant.svelte";
  import CafeteriaInterior from "./CafeteriaInterior.svelte";

  let {
    floor,
    talking,
    readonly = false,
    pending = false,
    onjoin,
    onself,
  }: {
    floor: Floor;
    talking: Record<number, boolean>;
    readonly?: boolean;
    pending?: boolean;
    onjoin: (channelId: number) => void;
    onself?: () => void;
  } = $props();

  const space = $derived(floor.corridor);
  let width = $state(0);
  let height = $state(0);
  const rect = $derived(cafeRect(width, height));
  /** one unit of the drawing in pixels; an avatar (44 px) fits a seat (33 units) or shrinks to it */
  const unit = $derived(rect.width / CAFE_VIEW.width);
  const avatarScale = $derived(Math.min(1, (33 * unit - 4) / 44));
  const seats = $derived(seating(space.users));
  const lit = $derived(space.users.length > 0);
  const locked = $derived(space.locked && !space.isSelf);
  const label = $derived(
    t().cafeteria.name + (space.isSelf ? t().space.here : readonly ? "" : locked ? t().space.noAccess : pending ? t().space.entering : t().space.enter),
  );

  function go(): void {
    if (space.isSelf || readonly || locked || pending) return;
    onjoin(space.channelId);
  }
  // the own avatar answers a single click (the cafeteria only a double click)
  function clickSelf(e: MouseEvent): void {
    const anchor = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-session]");
    if (!onself || readonly || !anchor || !space.users.some((u) => u.isSelf && u.session === Number(anchor.dataset.session))) return;
    e.stopPropagation();
    onself();
  }
</script>

<div class="lobby" bind:clientWidth={width} bind:clientHeight={height} data-channel={space.channelId}>
  <div class="free">
    <span class="title">{t().cafeteria.lobby}</span>
    <!-- the entrance at the bottom left, a plant on either side -->
    <span class="entrance" aria-hidden="true">
      <span class="plant"><Plant size={26} subtle /></span>
      <svg class="door" width="48" height="46" viewBox="0 0 48 46"><path d="M2 46 V2 A44 44 0 0 1 46 46" class="arc" /><line x1="2" y1="46" x2="2" y2="2" class="leaf" /></svg>
      <span class="plant"><Plant size={26} subtle /></span>
    </span>
  </div>
  {#if rect.width > 0}
    <div
      class="cafe"
      class:lit
      class:mine={space.isSelf}
      class:locked
      class:pending
      role="button"
      tabindex="0"
      aria-label={label}
      aria-disabled={space.isSelf || locked || readonly || undefined}
      style:left="{rect.x}px"
      style:width="{rect.width}px"
      style:height="{rect.height}px"
      style:--avatar-scale={avatarScale}
      ondblclick={go}
      onclick={clickSelf}
      onkeydown={onActivateKey(go)}
    >
      <CafeteriaInterior {lit} />
      {#each seats as s (s.user.session)}
        {@const p = fraction(s.at)}
        <span class="seated" class:standing={!s.seated} style:left="{p.fx * 100}%" style:top="{p.fy * 100}%">
          <Avatar user={s.user} talking={talking[s.user.session] ?? false} showName={false} action={s.user.isSelf && onself && !readonly ? t().status.clickHint : undefined} />
        </span>
      {/each}
      <span class="plate">
        <span class="name">{t().cafeteria.name}</span>
        <span class="count">{countText(space.users.length)}</span>
      </span>
    </div>
  {/if}
</div>

<style>
  .lobby { position: relative; flex: 1 1 auto; min-width: 0; min-height: 0; background: var(--color-paper); }
  .free { position: absolute; inset: 0; padding: 20px 22px; pointer-events: none; }
  .title { font-size: 20px; font-weight: 700; color: var(--color-ink); }
  .entrance { position: absolute; left: 60px; bottom: 0; display: flex; align-items: flex-end; gap: 10px; }
  .plant { display: flex; padding-bottom: 6px; }
  .door { display: block; }
  .arc { fill: none; stroke: var(--color-blue-300); stroke-width: 1.5; }
  .leaf { stroke: var(--color-ink); stroke-width: 3; }
  .cafe { position: absolute; top: 0; cursor: pointer; outline-offset: -6px; }
  .cafe:focus-visible { outline: 3px solid var(--color-sky); }
  .cafe.mine, .cafe.locked, .cafe[aria-disabled="true"] { cursor: default; }
  .cafe.locked { cursor: not-allowed; }
  .cafe.pending { cursor: progress; }
  /* a visitor sits on the centre of their seat; the avatar shrinks with the cafeteria */
  .seated { position: absolute; z-index: 1; transform: translate(-50%, -50%) scale(var(--avatar-scale, 1)); }
  .seated :global(.person) { width: auto; }
  .plate { position: absolute; z-index: 1; right: 14px; bottom: 10px; display: flex; flex-direction: column; align-items: flex-end; line-height: 1.25; pointer-events: none; }
  .plate .name { font-size: 15px; font-weight: 700; color: var(--color-ink); }
  .plate .count { font-size: 12px; color: var(--color-blue-700); }
</style>

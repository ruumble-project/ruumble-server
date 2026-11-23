<script lang="ts">
  // the cafeteria seen from every floor (#30): while someone is in it, a cone of light rises out of its door to the
  // north into the gap below the top bar, and one falls out of its window to the east onto the narrow margin, stronger
  // the more people are inside. The chalkboard sign stands in the top bar's row, directly left of the tube mail button;
  // a click goes to the cafeteria. The door is directly left of the sign (within the free stretch of the north wall,
  // model/cafeteria.ts); the cafeteria in the lobby draws its door there too (door.svelte.ts).
  // Sits in the floor plan's frame (.plan) and measures the floor plan in it.
  import { cafeRect, CAFE_VIEW, doorAt, EAST_WINDOW, glow, NORTH_DOOR } from "../../model/cafeteria.ts";
  import { door as doorState } from "./door.svelte.ts";
  import type { Cafeteria } from "../../model/building.ts";
  import { t } from "../../i18n/index.svelte.ts";
  import { names } from "../../taskboard/model.ts";
  import Chalkboard from "./Chalkboard.svelte";

  let {
    cafeteria,
    readonly = false,
    floorId,
    onjoin,
    returnTo = null,
    onreturn,
  }: {
    cafeteria: Cafeteria;
    readonly?: boolean;
    floorId: number | null;
    onjoin: () => void;
    /** inside the cafeteria: the room one came from; the sign leads back there */
    returnTo?: { id: number; name: string } | null;
    onreturn?: (channelId: number) => void;
  } = $props();
  /** in the lobby the door and the window are openings in the building's outer wall */
  const lobby = $derived(floorId === 0);

  const SIGN_WIDTH = 40;
  const count = $derived(cafeteria.users.length);
  const strength = $derived(glow(count));
  const label = $derived(count ? t().cafeteria.go(names(cafeteria.users.map((u) => u.name))) : t().cafeteria.goEmpty);

  let anchor = $state<HTMLElement | null>(null);
  let geo = $state<{ door: number; doorWidth: number; window: number; windowHeight: number; planWidth: number; sign: number } | null>(null);

  function measure(): void {
    const plan = anchor?.parentElement;
    const fp = plan?.querySelector<HTMLElement>(".floorplan");
    if (!plan || !fp) return void (geo = null);
    const r = cafeRect(fp.clientWidth, fp.clientHeight);
    if (r.width <= 0) return void (geo = null);
    const unit = r.width / CAFE_VIEW.width;
    const cafeLeft = fp.offsetLeft + r.x;
    const doorWidth = NORTH_DOOR.width * unit;
    // the sign directly left of the tube mail button, the door directly left of the sign
    const planLeft = plan.getBoundingClientRect().left;
    const tube = document.querySelector("[data-tube-button]")?.getBoundingClientRect();
    const wanted = tube ? tube.left - planLeft - SIGN_WIDTH - 6 : null;
    const doorX = doorAt(wanted === null ? NORTH_DOOR.x : CAFE_VIEW.x + (wanted - 6 - doorWidth - cafeLeft) / unit);
    doorState.x = doorX;
    const door = cafeLeft + (doorX - CAFE_VIEW.x) * unit;
    const sign = wanted ?? door + doorWidth + 6;
    geo = {
      door,
      doorWidth,
      window: fp.offsetTop + r.y + ((EAST_WINDOW.y - CAFE_VIEW.y) / CAFE_VIEW.height) * r.height,
      windowHeight: (EAST_WINDOW.height / CAFE_VIEW.height) * r.height,
      planWidth: plan.clientWidth,
      sign,
    };
  }

  $effect(() => {
    void floorId;
    const plan = anchor?.parentElement;
    if (!plan) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(plan);
    const fp = plan.querySelector(".floorplan");
    if (fp) observer.observe(fp);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  });
</script>

<span class="anchor" bind:this={anchor} aria-hidden="true"></span>
{#if geo}
  {#if lobby}
    <span class="opening north" class:lit={count > 0} style:left="{geo.door}px" style:width="{geo.doorWidth}px" aria-hidden="true"></span>
    <span class="opening east" class:lit={count > 0} style:left="calc({geo.planWidth}px - var(--wall))" style:top="{geo.window}px" style:height="{geo.windowHeight}px" aria-hidden="true"></span>
  {/if}
  <span class="cone north" style:left="{geo.door - 26}px" style:width="{geo.doorWidth + 52}px" style:opacity={strength} aria-hidden="true"></span>
  <span class="cone east" style:left="{geo.planWidth}px" style:top="{geo.window - 18}px" style:height="{geo.windowHeight + 36}px" style:opacity={strength} aria-hidden="true"></span>
  {#if !readonly && !cafeteria.isSelf}
    <button type="button" class="sign" class:empty={count === 0} style:left="{geo.sign}px" aria-label={label} title={label} onclick={onjoin}>
      <Chalkboard {count} width={SIGN_WIDTH} />
    </button>
  {:else if !readonly && returnTo && onreturn}
    <!-- inside the cafeteria: the sign leads back to where one came from -->
    {@const back = t().cafeteria.back(returnTo.name)}
    <button type="button" class="sign" style:left="{geo.sign}px" aria-label={back} title={back} onclick={() => onreturn(returnTo.id)}>
      <Chalkboard back width={SIGN_WIDTH} />
    </button>
  {/if}
{/if}

<style>
  .anchor { display: none; }
  /* in the lobby: the door and the window cut into the building's wall, glowing while someone is inside */
  .opening { position: absolute; z-index: 1; background: var(--color-blue-300); transition: background 900ms ease; pointer-events: none; }
  .opening.lit { background: var(--color-lamp); }
  .opening.north { top: 0; height: var(--wall); }
  .opening.east { width: var(--wall); }
  /* the cone out of the north door: from the building's top edge up through the gap below the top bar */
  .cone { position: absolute; z-index: 0; pointer-events: none; transition: opacity 1200ms ease; }
  .cone.north {
    top: calc(-12px - var(--topbar-height)); height: calc(12px + var(--topbar-height));
    clip-path: polygon(0 0, 100% 0, calc(100% - 26px) 100%, 26px 100%);
    background: linear-gradient(to top, var(--color-lamp), transparent);
  }
  /* the cone out of the east window: onto the narrow margin right of the building */
  .cone.east {
    width: 32px;
    clip-path: polygon(0 18px, 100% 0, 100% 100%, 0 calc(100% - 18px));
    background: linear-gradient(to right, var(--color-lamp), transparent);
  }
  /* above the top bar (5), so it can be clicked there; below it while one of its dropdowns is open (26) */
  .sign {
    position: absolute; z-index: 6; top: calc(-12px - var(--topbar-height) + 4px); padding: 0; border: 0; border-radius: var(--radius-md);
    background: transparent; cursor: pointer; transition: transform var(--dur) var(--ease-out), opacity var(--dur);
  }
  .sign:hover, .sign:focus-visible { transform: translateY(-2px) scale(1.06); }
  .sign:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 2px; }
  .sign.empty { opacity: 0.6; }
  .sign.empty:hover, .sign.empty:focus-visible { opacity: 1; }
  @media (prefers-reduced-motion: reduce) { .cone, .sign { transition: none; } }
</style>

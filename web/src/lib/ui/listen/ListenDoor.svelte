<script lang="ts">
  // The door of a room at the corridor wall (#19). Closed where Mumble does not let the user in, ajar (33°) where it
  // does, a little further open (45°) with an ear in the opening while the user listens in.
  // Inside Ruumble Client, on the own floor, it is a button: a click opens it (listen in) or closes it again. Hovering
  // the room strengthens its swing line a little; hovering the door swings the leaf a bit further and shows a faint
  // ear. While open, a small tag beside it opens the volume. Elsewhere it is only the drawing it always was.
  import Volume1 from "@lucide/svelte/icons/volume-1";
  import type { ListenView } from "../../state.svelte.ts";
  import ListenVolume from "./ListenVolume.svelte";
  import { t } from "../../i18n/index.svelte.ts";
  import { placeNear, swallowClickBeside, toBody } from "../popover.ts";

  let {
    room, channelId, closed, lower, listen, ontoggle, onvolume,
  }: {
    room: string;
    channelId: number;
    /** no Enter permission: the door is shut */
    closed: boolean;
    /** lower row: the corridor is above, the door mirrored */
    lower: boolean;
    listen?: ListenView;
    ontoggle?: () => void;
    onvolume?: (db: number) => void;
  } = $props();

  const open = $derived(!!listen?.open);
  const doorState = $derived(open ? "open" : closed ? "closed" : "ajar");
  const interactive = $derived(!!listen?.interactive);
  const label = $derived(listen?.pending ? t().listen.waiting(room) : open ? t().listen.stop(room) : t().listen.start(room));

  const popoverId = $derived(`listen-volume-${channelId}`);
  let tag = $state<HTMLButtonElement | null>(null);
  let popover = $state<HTMLElement | null>(null);
  let volumeOpen = $state(false);

  function onbeforetoggle(e: ToggleEvent): void {
    if (e.newState === "open" && popover) popover.style.visibility = "hidden";
  }
  function ontoggleVolume(e: ToggleEvent): void {
    volumeOpen = e.newState === "open";
    if (!volumeOpen || !popover || !tag) return;
    placeNear(tag, popover);
    popover.style.visibility = "";
    // the slider right away: the popup sits at the end of <body>, Tab would not reach it from the tag
    popover.querySelector("input")?.focus({ preventScroll: true });
  }
  // a click beside it only closes it (it opens no other door); the door closed from elsewhere (top bar, a rule)
  // removes the popup without a toggle event
  $effect(() => {
    if (volumeOpen) return swallowClickBeside(() => [popover, tag]);
  });
  $effect(() => {
    if (!open) volumeOpen = false;
  });

  function stop(): void {
    popover?.hidePopover();
    ontoggle?.();
  }
</script>

{#snippet drawing()}
  <svg class="door {doorState}" class:hint={interactive} width="48" height="52" viewBox="0 0 48 52" fill="none" aria-hidden="true">
    <rect x="2" y="48" width="44" height="4" class="opening" />
    <path d="M46 50A44 44 0 0 0 2 6" class="swing" />
    <!-- Lucide's ear, small in the opening: faint on hover, solid while listening -->
    <g class="ear">
      <g transform="translate(25 31) scale(0.55)">
        <path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0" />
        <path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4" />
      </g>
    </g>
    <path d="M2 50H46" class="leaf" />
  </svg>
{/snippet}

{#if interactive}
  <button
    type="button" class="door-spot door-button" class:lower class:pending={listen?.pending} data-door={channelId}
    aria-label={label} title={label} aria-pressed={open} aria-busy={listen?.pending || undefined}
    onclick={() => ontoggle?.()}
  >
    {@render drawing()}
  </button>
{:else}
  <span class="door-spot" class:lower>{@render drawing()}</span>
{/if}

{#if open && interactive && onvolume && listen}
  <button
    bind:this={tag} type="button" class="volume-tag" class:lower aria-label={t().listen.volumeOf(room)} title={t().listen.volumeOf(room)}
    aria-expanded={volumeOpen} aria-controls={popoverId} popovertarget={popoverId}
  >
    <Volume1 size={15} aria-hidden="true" />
  </button>
  <div bind:this={popover} id={popoverId} class="volume-popover" popover="auto" role="dialog" aria-label={t().listen.volumeOf(room)} {@attach toBody} {onbeforetoggle} ontoggle={ontoggleVolume}>
    <div class="head">{room}</div>
    <ListenVolume {room} volume={listen.volume} {onvolume} />
    <button type="button" class="stop" onclick={stop}>{t().listen.stop(room)}</button>
  </div>
{/if}

<style>
  /* the door at the corridor wall: the white strip cuts the opening into the wall; mirrored in the lower row. Only a
     drawing: clicks go through to the room below (double click to enter, drops, the context menu) */
  .door-spot { pointer-events: none; position: absolute; left: 34px; bottom: calc(-1 * var(--wall)); z-index: 2; display: block; width: 48px; height: 52px; line-height: 0; }
  .door-spot.lower { bottom: auto; top: calc(-1 * var(--wall)); }
  .door-spot.lower .door { transform: scaleY(-1); }
  .door-button { pointer-events: auto; border: 0; padding: 0; margin: 0; background: transparent; cursor: pointer; border-radius: var(--radius-md); }
  .door-button.pending { cursor: progress; }
  .door-button:focus-visible { outline: 3px solid var(--color-sky); outline-offset: -2px; }

  .door { overflow: visible; display: block; }
  .door .opening { fill: var(--color-paper); }
  /* the leaf turns about its hinge (2, 50); the swing shows the part of the quarter circle (length 69.12) it has opened */
  .door .leaf {
    stroke: var(--color-blue-700); stroke-width: 2; stroke-linecap: round;
    transform-box: view-box; transform-origin: 2px 50px; transform: rotate(-33deg);
    transition: transform 150ms var(--ease-out);
  }
  .door .swing {
    stroke: var(--color-blue-300); stroke-width: 1.5; stroke-dasharray: 69.12; stroke-dashoffset: 43.78;
    transition: stroke-dashoffset 150ms var(--ease-out), stroke var(--dur) var(--ease-out);
  }
  .door .ear { stroke: var(--color-blue-500); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; opacity: 0; transition: opacity 150ms var(--ease-out); }
  /* the mirrored door would turn the ear upside down */
  .door-spot.lower .ear { transform-box: fill-box; transform-origin: center; transform: scaleY(-1); }
  .door.closed .leaf { transform: none; stroke: var(--color-blue-500); stroke-width: 3; stroke-linecap: butt; }
  .door.closed .swing { stroke-dashoffset: 69.12; }
  /* listening: 45°, the swing line stronger */
  .door.open .leaf { transform: rotate(-45deg); }
  .door.open .swing { stroke-dashoffset: 34.56; stroke: var(--color-blue-500); }
  .door.open .ear { opacity: 1; }

  /* hovering the room: the swing line of a door one can open gets a little stronger */
  :global(.wrap-room:hover) .door.hint.ajar .swing { stroke: var(--color-blue-500); }
  /* hovering the door: the leaf swings a bit further, a faint ear shows in the opening */
  /* hovering the door: it opens a little, to where it stands while listening, a faint ear shows in the opening */
  .door-button:hover .door.ajar .leaf, .door-button:focus-visible .door.ajar .leaf { transform: rotate(-45deg); }
  .door-button:hover .door.ajar .swing, .door-button:focus-visible .door.ajar .swing { stroke-dashoffset: 34.56; }
  .door-button:hover .door.ajar .ear, .door-button:focus-visible .door.ajar .ear { opacity: 0.45; }
  /* an open door swings back a little: a click closes it */
  /* an open door swings back to ajar, the swing line with it: a click closes it */
  .door-button:hover .door.open .leaf, .door-button:focus-visible .door.open .leaf { transform: rotate(-33deg); }
  .door-button:hover .door.open .swing, .door-button:focus-visible .door.open .swing { stroke-dashoffset: 43.78; }
  .door-button:hover .door.open .ear, .door-button:focus-visible .door.open .ear { opacity: 0.45; }
  .door-button.pending .door.ajar .leaf { transform: rotate(-45deg); }
  .door-button.pending .door.ajar .swing { stroke-dashoffset: 34.56; }

  @media (prefers-reduced-motion: reduce) {
    .door .leaf, .door .swing, .door .ear { transition: none; }
  }

  /* the volume tag beside the open door, in the door strip */
  .volume-tag {
    position: absolute; left: 84px; bottom: 6px; z-index: 2; width: 30px; height: 30px; padding: 0; display: grid; place-items: center;
    border: 1.5px solid var(--color-blue-300); border-radius: 50%; background: var(--color-paper); color: var(--color-blue-700); cursor: pointer;
    transition: transform var(--dur) var(--ease-out);
  }
  .volume-tag.lower { bottom: auto; top: 6px; }
  .volume-tag:hover, .volume-tag[aria-expanded="true"] { transform: scale(1.08); border-color: var(--color-blue-500); }
  .volume-tag:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 1px; }

  .volume-popover {
    position: fixed; inset: auto; margin: 0; box-sizing: border-box; width: 260px; max-width: calc(100vw - 32px);
    padding: 12px 14px; border: 0; border-radius: var(--radius-md); border-top: 4px solid var(--color-blue-500);
    background: var(--color-raised); color: var(--color-ink); box-shadow: 0 0 0 1px var(--color-raised-edge), 0 10px 28px rgb(0 56 105 / 0.35);
    font-size: 14px;
  }
  .head { font-weight: 700; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .stop {
    margin-top: 10px; width: 100%; padding: 7px 10px; border: 1px solid var(--color-blue-300); border-radius: var(--radius-md);
    background: transparent; color: var(--color-ink); font: inherit; font-size: 13px; cursor: pointer;
  }
  .stop:hover { background: var(--color-blue-50); }
  .stop:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 1px; }
</style>

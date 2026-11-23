<script lang="ts">
  // the plaque on a room's outer wall (#29): centred on the wall away from the corridor, it fades in slowly while the
  // wall below lights up in the colour of the event, breathes twice and then stands still until it fades out. Hovering
  // keeps it; a click opens the task board. Several in a row wait behind it ("+n").
  import Check from "@lucide/svelte/icons/check";
  import Hand from "@lucide/svelte/icons/hand";
  import Footprints from "@lucide/svelte/icons/footprints";
  import { t } from "../../i18n/index.svelte.ts";
  import { NOTICE_MS, type RoomNotice } from "../../taskboard/state.svelte.ts";

  let { notice, waiting = 0, lower = false, onexpire, onopen }: { notice: RoomNotice; waiting?: number; lower?: boolean; onexpire: (key: number) => void; onopen?: () => void } = $props();

  /** fading out at the end */
  let leaving = $state(false);
  let hovered = $state(false);
  const FADE_MS = 600;

  $effect(() => {
    const key = notice.key;
    leaving = false;
    if (hovered) return;
    const fade = setTimeout(() => (leaving = true), NOTICE_MS - FADE_MS);
    const done = setTimeout(() => onexpire(key), NOTICE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  });
</script>

{#key notice.key}
  <span class="sr-only" role="status">{notice.text}</span>
  <span class="glow tone-{notice.tone}" class:lower class:leaving aria-hidden="true"></span>
  <button
    type="button"
    class="plaque tone-{notice.tone}"
    class:lower
    class:leaving
    aria-hidden={onopen ? undefined : "true"}
    tabindex={onopen ? undefined : -1}
    title={onopen ? t().taskboard.notice.open : undefined}
    onclick={onopen}
    onpointerenter={() => (hovered = true)}
    onpointerleave={() => (hovered = false)}
    onfocus={() => (hovered = true)}
    onblur={() => (hovered = false)}
  >
    <span class="icon" aria-hidden="true">
      {#if notice.tone === "done"}<Check size={15} strokeWidth={3} />{:else if notice.tone === "help"}<Footprints size={15} strokeWidth={2.5} />{:else}<Hand size={15} strokeWidth={2.5} />{/if}
    </span>
    <span class="text">{notice.text}</span>
    {#if waiting > 0}<span class="more">{t().taskboard.notice.more(waiting)}</span>{/if}
  </button>
{/key}

<style>
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  /* the light along the outer wall: from the middle outwards */
  .glow {
    position: absolute; z-index: 3; left: 10%; right: 10%; top: 0; height: 4px; border-radius: 4px; pointer-events: none;
    background: linear-gradient(90deg, transparent, var(--tone) 30%, var(--tone) 70%, transparent);
    animation: glow-in 1100ms var(--ease-out) both;
  }
  .glow.lower { top: auto; bottom: 0; }
  .plaque {
    position: absolute; z-index: 4; left: 50%; top: 10px; transform: translateX(-50%);
    display: flex; align-items: center; gap: 8px; max-width: calc(100% - 24px); padding: 4px 12px 4px 4px;
    border: 1.5px solid var(--tone); border-radius: 999px; background: var(--color-paper); color: var(--color-ink);
    font: inherit; font-size: 13px; line-height: 1.3; text-align: left; cursor: pointer; white-space: nowrap;
    box-shadow: 0 0 0 4px var(--halo), 0 10px 24px -10px rgb(0 30 60 / 0.45);
    animation: plaque-in 900ms var(--ease-out) both, breathe 2.6s ease-in-out 900ms 2;
  }
  .plaque.lower { top: auto; bottom: 10px; animation-name: plaque-in-low, breathe; }
  .plaque:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 2px; }
  .icon { flex: none; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--tone); color: var(--tone-on); }
  .text { min-width: 0; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
  .more { flex: none; padding-left: 8px; border-left: 1px solid var(--color-blue-300); font-size: 11px; font-weight: 700; color: var(--tone-text); }
  .tone-signal { --tone: var(--color-signal); --tone-on: var(--color-signal-on); --tone-text: var(--color-signal-ink); --halo: var(--signal-glow); }
  .tone-help { --tone: var(--color-sky); --tone-on: var(--color-white); --tone-text: var(--color-link); --halo: var(--help-glow); }
  .tone-done { --tone: var(--color-leaf); --tone-on: var(--color-white); --tone-text: var(--color-leaf-dark); --halo: var(--done-glow); }
  .plaque.leaving { animation: plaque-out 600ms ease-in forwards; }
  .glow.leaving { animation: glow-out 600ms ease-in forwards; }

  @keyframes plaque-in {
    from { opacity: 0; transform: translate(-50%, -10px) scale(0.96); filter: blur(2px); }
    to { opacity: 1; transform: translate(-50%, 0) scale(1); filter: blur(0); }
  }
  @keyframes plaque-in-low {
    from { opacity: 0; transform: translate(-50%, 10px) scale(0.96); filter: blur(2px); }
    to { opacity: 1; transform: translate(-50%, 0) scale(1); filter: blur(0); }
  }
  @keyframes breathe {
    0%, 100% { box-shadow: 0 0 0 4px var(--halo), 0 10px 24px -10px rgb(0 30 60 / 0.45); }
    50% { box-shadow: 0 0 0 9px var(--halo), 0 10px 24px -10px rgb(0 30 60 / 0.45); }
  }
  @keyframes glow-in {
    0% { opacity: 0; transform: scaleX(0.2); }
    60% { opacity: 1; }
    100% { opacity: 0.9; transform: scaleX(1); }
  }
  @keyframes plaque-out { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, 0); } }
  @keyframes glow-out { from { opacity: 0.9; } to { opacity: 0; } }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .plaque, .plaque.lower { animation: fade-in 300ms ease-out both; }
    .glow { animation: fade-in 300ms ease-out both; }
  }
</style>

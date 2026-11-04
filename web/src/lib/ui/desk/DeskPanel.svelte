<script lang="ts">
  import AudioLines from "@lucide/svelte/icons/audio-lines";
  import Menu from "@lucide/svelte/icons/menu";
  import SendHorizontal from "@lucide/svelte/icons/send-horizontal";
  import Server from "@lucide/svelte/icons/server";
  import Settings from "@lucide/svelte/icons/settings";
  import Unplug from "@lucide/svelte/icons/unplug";
  import X from "@lucide/svelte/icons/x";
  import { timeOf } from "../../desk/model.ts";
  import { locale, t } from "../../i18n/index.svelte.ts";
  import { ownPlace } from "../../model/building.ts";
  import type { RuumbleState } from "../../state.svelte.ts";

  // Ruumble Desk (ADR-0024): the Mumble client's log and channel chat, and its dialogs, in a window docked at the bottom
  // left (the direct chat docks at the right). Only exists inside the Ruumble Desk client.
  let { app }: { app: RuumbleState } = $props();

  const desk = $derived(app.desk);
  // the own place as the building names it ("Entrance", "Corridor", the room), not Mumble's channel name
  const room = $derived(app.building && app.snapshot ? (ownPlace(app.building, app.snapshot)?.name ?? "") : "");
  let list = $state<HTMLElement | null>(null);
  let input = $state<HTMLTextAreaElement | null>(null);

  // the newest entry in view
  const count = $derived(desk.entries.length);
  $effect(() => {
    void count;
    if (list) list.scrollTop = list.scrollHeight;
  });
  $effect(() => input?.focus());

  function onkeydown(e: KeyboardEvent): void {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      desk.send();
    } else if (e.key === "Escape") {
      e.preventDefault();
      desk.close();
    }
  }
</script>

<section class="desk" aria-label={t().desk.title}>
  <div class="bar">
    <h2>{t().desk.title}</h2>
    <span class="server" title={desk.server ? t().desk.server : undefined}>{desk.server}</span>
    <button type="button" class="bar-btn" aria-label={t().desk.menu} title={`${t().desk.menu} (F10)`} onclick={(e) => desk.showMenuAt(e.currentTarget)}><Menu size={18} /></button>
    <button type="button" class="bar-btn" aria-label={t().desk.connect} title={t().desk.connect} onclick={() => desk.openConnect()}><Server size={18} /></button>
    <button type="button" class="bar-btn" aria-label={t().desk.audioWizard} title={t().desk.audioWizard} onclick={() => desk.openAudioWizard()}><AudioLines size={18} /></button>
    <button type="button" class="bar-btn" aria-label={t().desk.mumbleSettings} title={`${t().desk.mumbleSettings} (Ctrl+,)`} onclick={() => desk.openSettings()}><Settings size={18} /></button>
    {#if desk.server}
      <button type="button" class="bar-btn" aria-label={t().desk.disconnect} title={t().desk.disconnect} onclick={() => desk.disconnect()}><Unplug size={18} /></button>
    {/if}
    <button type="button" class="bar-btn" aria-label={t().desk.close} title={t().desk.close} onclick={() => desk.close()}><X size={18} /></button>
  </div>

  <div class="log" bind:this={list} role="log" aria-live="polite">
    {#each desk.entries as entry (entry.id)}
      <div class="entry {entry.kind}">
        <time>{timeOf(entry.time, locale())}</time>
        <span class="text">{entry.text}</span>
      </div>
    {:else}
      <p class="empty">{t().desk.empty}</p>
    {/each}
  </div>

  <div class="compose">
    <textarea
      bind:this={input} bind:value={desk.draft} rows="1" maxlength="5000"
      placeholder={room ? t().desk.messageTo(room) : t().desk.message} aria-label={room ? t().desk.messageTo(room) : t().desk.message}
      disabled={!app.me} {onkeydown}
    ></textarea>
    <button type="button" class="round solid" aria-label={t().desk.send} title={t().desk.send}
      disabled={!app.me || desk.sending || !desk.draft.trim()} onclick={() => desk.send()}><SendHorizontal size={18} /></button>
  </div>
</section>

<style>
  .desk {
    --color-paper: var(--color-raised);
    position: fixed; left: 32px; bottom: 24px; z-index: 20; width: 420px; height: min(520px, calc(100vh - 120px));
    display: flex; flex-direction: column; overflow: hidden; border-radius: 10px; background: var(--color-paper); color: var(--color-ink);
    box-shadow: 0 0 0 1px var(--color-raised-edge), 0 16px 48px rgb(0 56 105 / 0.28), 0 2px 6px rgb(0 56 105 / 0.15);
    animation: rise 200ms var(--ease-out) both;
  }
  @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .desk { animation: none; } }

  .bar { display: flex; align-items: center; gap: 2px; height: 44px; flex: none; padding: 0 6px 0 14px; background: var(--color-wall); color: var(--color-white); }
  h2 { margin: 0 8px 0 0; font-size: 14px; font-weight: 700; letter-spacing: 0.02em; }
  .server { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--color-plate-muted); }
  .bar-btn { width: 36px; height: 36px; flex: none; display: grid; place-items: center; border: 0; border-radius: var(--radius-md); background: transparent; color: var(--color-plate-muted); cursor: pointer; }
  .bar-btn:hover { background: rgb(255 255 255 / 0.12); color: var(--color-white); }

  .log { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; scrollbar-width: thin; }
  .entry { display: flex; gap: 8px; align-items: baseline; font-size: 13px; line-height: 1.45; }
  .entry time { flex: none; font-size: 11px; color: var(--color-blue-700); font-variant-numeric: tabular-nums; }
  .text { white-space: pre-wrap; overflow-wrap: anywhere; }
  .entry.info .text { color: var(--color-blue-700); }
  .entry.warning .text { color: var(--color-alert); font-weight: 600; }
  .entry.text .text, .entry.private .text, .entry.own .text {
    padding: 6px 10px; border-radius: 12px 12px 12px 4px; background: var(--color-blue-50); color: var(--color-ink); font-size: 14px;
  }
  .entry.private .text { box-shadow: inset 0 0 0 1px var(--color-blue-300); }
  .entry.own { flex-direction: row-reverse; }
  .entry.own .text { border-radius: 12px 12px 4px 12px; background: var(--color-ink); color: var(--color-paper); }
  .empty { margin: auto; font-size: 13px; color: var(--color-blue-700); text-align: center; }

  .compose { flex: none; display: flex; align-items: flex-end; gap: 6px; padding: 10px; border-top: 1px solid var(--color-blue-100); }
  textarea {
    flex: 1; min-width: 0; min-height: 40px; max-height: 132px; box-sizing: border-box; padding: 9px 14px; border: 1px solid var(--color-blue-300); border-radius: 20px;
    background: var(--color-paper); color: var(--color-ink); font: inherit; font-size: 14px; line-height: 20px; resize: none;
  }
  textarea:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 1px; }
  .round {
    width: 40px; height: 40px; flex: none; display: grid; place-items: center; border: 1px solid var(--color-ink); border-radius: 50%;
    background: var(--color-ink); color: var(--color-paper); cursor: pointer;
  }
  .round:hover:not(:disabled) { background: var(--color-ink-soft); }
  .round:disabled { opacity: 0.45; cursor: default; }
  .bar-btn:focus-visible, .round:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 1px; }
</style>

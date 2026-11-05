<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import SendHorizontal from "@lucide/svelte/icons/send-horizontal";
  import X from "@lucide/svelte/icons/x";
  import { DESK_FILTERS, timeOf, type DeskFilter } from "../../desk/model.ts";
  import { locale, t } from "../../i18n/index.svelte.ts";
  import { ownPlace, ownRow } from "../../model/building.ts";
  import type { RuumbleState } from "../../state.svelte.ts";

  // Ruumble Client (ADR-0024): "Ruumble in a box", the Mumble client's log and channel chat in a window docked at the
  // bottom left (the direct chat docks at the right), with a search, a filter by kind and a "New" line above what was
  // unread. Mumble's functions are in the footer of the elevator (TopBar). Only exists inside the Ruumble Client.
  let { app }: { app: RuumbleState } = $props();
  const desk = $derived(app.desk);
  // the own place as the building names it ("Entrance", "Corridor", the room), not Mumble's channel name
  const room = $derived(app.building && app.snapshot ? (ownPlace(app.building, app.snapshot)?.name ?? "") : "");
  const searching = $derived(desk.query.trim() !== "");
  // docked at the bottom left; when the own room is in the bottom row, at the top left, so it stays in view
  const atTop = $derived(ownRow(app.floor) === "bottom");

  let list = $state<HTMLElement | null>(null);
  let input = $state<HTMLTextAreaElement | null>(null);

  // on opening the "New" line in view, else the newest entry; later, new entries and a changed filter bring the newest
  // entry into view, unless a search is active
  const count = $derived(desk.visible.length);
  let opened = false;
  $effect(() => {
    void count;
    void desk.filter;
    if (!list) return;
    const line = opened ? null : list.querySelector<HTMLElement>(".new-line");
    if (line) list.scrollTop = line.offsetTop - list.offsetTop - 8;
    else if (!opened || !searching) list.scrollTop = list.scrollHeight;
    opened = true;
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
  function onsearchkey(e: KeyboardEvent): void {
    if (e.key !== "Escape") return;
    e.preventDefault();
    if (desk.query) desk.query = "";
    else desk.close();
  }
</script>

<section class="desk" class:top={atTop} aria-label={t().desk.title}>
  <div class="bar">
    <h2>{t().desk.title}</h2>
    <button type="button" class="bar-btn" aria-label={t().desk.close} title={t().desk.close} onclick={() => desk.close()}><X size={18} /></button>
  </div>
  <div class="tools">
    <label class="search">
      <Search size={16} aria-hidden="true" />
      <input type="search" bind:value={desk.query} placeholder={t().desk.search} aria-label={t().desk.search} onkeydown={onsearchkey} />
    </label>
    <select aria-label={t().desk.filter} title={t().desk.filter} value={desk.filter} onchange={(e) => desk.setFilter(e.currentTarget.value as DeskFilter)}>
      {#each DESK_FILTERS as f (f)}<option value={f}>{t().desk.filters[f]}</option>{/each}
    </select>
  </div>
  <div class="log" bind:this={list} role="log" aria-live="polite">
    {#each desk.visible as entry (entry.id)}
      {#if entry.id === desk.newFrom}
        <div class="new-line" role="separator" aria-label={t().desk.newLine}><span>{t().desk.newLine}</span></div>
      {/if}
      <div class="entry {entry.kind}">
        <time>{timeOf(entry.time, locale())}</time>
        <span class="text">{entry.text}</span>
      </div>
    {:else}
      <p class="empty">{desk.entries.length ? t().desk.nothingFound : t().desk.empty}</p>
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
  .desk.top { top: calc(var(--topbar-height) + 30px); bottom: auto; animation-name: drop; }
  @keyframes drop { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
  @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .desk, .desk.top { animation: none; } }

  .bar { display: flex; align-items: center; gap: 2px; height: 44px; flex: none; padding: 0 6px 0 14px; background: var(--color-wall); color: var(--color-white); }
  h2 { flex: 1; margin: 0 8px 0 0; font-size: 14px; font-weight: 700; letter-spacing: 0.02em; }
  .tools { flex: none; display: flex; gap: 6px; padding: 8px 10px; border-bottom: 1px solid var(--color-blue-100); }
  .search {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 10px; box-sizing: border-box;
    border: 1px solid var(--color-blue-300); border-radius: 17px; background: var(--color-paper); color: var(--color-blue-700);
  }
  .search:focus-within { outline: 3px solid var(--color-sky); outline-offset: 1px; }
  .search input { flex: 1; min-width: 0; border: 0; padding: 0; background: transparent; color: var(--color-ink); font: inherit; font-size: 13px; outline: none; }
  select {
    flex: none; height: 34px; padding: 0 8px; border: 1px solid var(--color-blue-300); border-radius: var(--radius-md);
    background: var(--color-paper); color: var(--color-ink); font: inherit; font-size: 13px; cursor: pointer;
  }
  select:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 1px; }
  .new-line { display: flex; align-items: center; gap: 8px; margin: 2px 0; color: var(--color-link); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  .new-line::before, .new-line::after { content: ""; flex: 1; height: 1px; background: currentColor; opacity: 0.6; }
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

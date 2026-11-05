<script lang="ts">
  import { untrack } from "svelte";
  import Search from "@lucide/svelte/icons/search";
  import SendHorizontal from "@lucide/svelte/icons/send-horizontal";
  import { DESK_FILTERS, timeOf } from "../../desk/model.ts";
  import FilterMenu from "../FilterMenu.svelte";
  import { locale, t } from "../../i18n/index.svelte.ts";
  import type { RuumbleState } from "../../state.svelte.ts";

  // Ruumble Client (ADR-0024): the room tab of Ruumble in a box (#10), the Mumble client's log and channel chat with a
  // search, a filter by kind and a "New" line above what was unread. The box around it (tabs, docking, Escape) is the
  // ChatPanel. Mumble's functions are in the footer of the elevator (TopBar). Only exists inside the Ruumble Client.
  // room: the own place as the building names it ("Entrance", "Corridor", the room), not Mumble's channel name; label:
  // the room tab's name. Both from the box (ChatPanel), which also styles the input row.
  let { app, room, label }: { app: RuumbleState; room: string; label: string } = $props();
  const desk = $derived(app.desk);
  const searching = $derived(desk.query.trim() !== "");

  let list = $state<HTMLElement | null>(null);

  // shown exactly while the room tab is in view: meanwhile the log counts as seen. A pre-effect, before the first
  // render, so the "New" line is there when the scroll below looks for it.
  $effect.pre(() => {
    const log = desk;
    untrack(() => log.setVisible(true));
    return () => log.setVisible(false);
  });

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

  function onkeydown(e: KeyboardEvent): void {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      desk.send();
    }
  }
  /** Escape in the search clears it first; with nothing to clear it closes the box (handled by the box) */
  function onsearchkey(e: KeyboardEvent): void {
    if (e.key !== "Escape" || !desk.query) return;
    e.preventDefault();
    e.stopPropagation();
    desk.query = "";
  }
</script>

<div class="room-log" id="box-room" role="tabpanel" aria-label={label}>
  <div class="tools">
    <label class="search">
      <Search size={16} aria-hidden="true" />
      <input type="search" bind:value={desk.query} placeholder={t().desk.search} aria-label={t().desk.search} onkeydown={onsearchkey} />
    </label>
    <FilterMenu options={DESK_FILTERS} value={desk.filter} text={(f) => t().desk.filters[f]} label={t().desk.filter} onchoose={(f) => desk.setFilter(f)} />
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
    <div class="compose-row">
      <textarea
        bind:value={desk.draft} rows="1" maxlength="5000"
        placeholder={room ? t().desk.messageTo(room) : t().desk.message} aria-label={room ? t().desk.messageTo(room) : t().desk.message}
        disabled={!app.me} {onkeydown}
      ></textarea>
      <button type="button" class="round solid" aria-label={t().desk.send} title={t().desk.send}
        disabled={!app.me || desk.sending || !desk.draft.trim()} onclick={() => desk.send()}><SendHorizontal size={20} /></button>
    </div>
  </div>
</div>

<style>
  .room-log { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  /* search and filter as on the board (BoardPanel) */
  .tools { flex: none; display: flex; gap: 6px; padding: 8px 10px; border-bottom: 1px solid var(--color-blue-100); }
  .search {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 10px; box-sizing: border-box;
    border: 1px solid var(--color-blue-300); border-radius: var(--radius-md); background: var(--color-paper); color: var(--color-link);
  }
  .search:focus-within { outline: 3px solid var(--color-sky); outline-offset: 0; }
  .search input { flex: 1; min-width: 0; border: 0; padding: 0; background: none; color: var(--color-ink); font: inherit; font-size: 14px; outline: 0; }
  .new-line { display: flex; align-items: center; gap: 8px; margin: 2px 0; color: var(--color-link); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  .new-line::before, .new-line::after { content: ""; flex: 1; height: 1px; background: currentColor; opacity: 0.6; }

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
</style>

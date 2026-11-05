<script lang="ts">
  import ListFilter from "@lucide/svelte/icons/list-filter";
  import Search from "@lucide/svelte/icons/search";
  import SendHorizontal from "@lucide/svelte/icons/send-horizontal";
  import { DESK_FILTERS, timeOf, type DeskFilter } from "../../desk/model.ts";
  import { locale, t } from "../../i18n/index.svelte.ts";
  import { ownPlace } from "../../model/building.ts";
  import type { RuumbleState } from "../../state.svelte.ts";

  // Ruumble Client (ADR-0024): the room tab of Ruumble in a box (#10), the Mumble client's log and channel chat with a
  // search, a filter by kind and a "New" line above what was unread. The box around it (tabs, docking, Escape) is the
  // ChatPanel. Mumble's functions are in the footer of the elevator (TopBar). Only exists inside the Ruumble Client.
  let { app }: { app: RuumbleState } = $props();
  const desk = $derived(app.desk);
  // the own place as the building names it ("Entrance", "Corridor", the room), not Mumble's channel name
  const room = $derived(app.building && app.snapshot ? (ownPlace(app.building, app.snapshot)?.name ?? "") : "");
  const searching = $derived(desk.query.trim() !== "");

  let list = $state<HTMLElement | null>(null);

  // filter menu, as on the board: closes on a choice, Escape (only the menu, not the box) and a click elsewhere
  let filterOpen = $state(false);
  let filterButton = $state<HTMLButtonElement | null>(null);
  $effect(() => {
    if (!filterOpen) return;
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest(".filter")) filterOpen = false; };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  });
  function choose(f: DeskFilter): void {
    desk.setFilter(f);
    filterOpen = false;
    filterButton?.focus();
  }
  function onmenukey(e: KeyboardEvent): void {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    filterOpen = false;
    filterButton?.focus();
  }

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

<div class="room-log" id="box-room" role="tabpanel" aria-label={room ? t().box.roomTab(room) : t().box.roomTabPlain}>
  <div class="tools">
    <label class="search">
      <Search size={16} aria-hidden="true" />
      <input type="search" bind:value={desk.query} placeholder={t().desk.search} aria-label={t().desk.search} onkeydown={onsearchkey} />
    </label>
    <div class="filter">
      <button
        type="button" class="tool" bind:this={filterButton} class:active={desk.filter !== "all"} aria-haspopup="menu" aria-expanded={filterOpen}
        aria-label={t().desk.filter} title={t().desk.filter} onclick={() => (filterOpen = !filterOpen)}
      >
        <ListFilter size={18} aria-hidden="true" />
        {#if desk.filter !== "all"}<span class="dot" aria-hidden="true"></span>{/if}
      </button>
      {#if filterOpen}
        <div class="menu" role="menu" tabindex="-1" onkeydown={onmenukey}>
          {#each DESK_FILTERS as f, i (f)}
            <button type="button" role="menuitemradio" aria-checked={desk.filter === f} onclick={() => choose(f)} {@attach (el) => { if (i === 0) el.focus(); }}>
              {t().desk.filters[f]}
            </button>
          {/each}
        </div>
      {/if}
    </div>
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
      bind:value={desk.draft} rows="1" maxlength="5000"
      placeholder={room ? t().desk.messageTo(room) : t().desk.message} aria-label={room ? t().desk.messageTo(room) : t().desk.message}
      disabled={!app.me} {onkeydown}
    ></textarea>
    <button type="button" class="send" aria-label={t().desk.send} title={t().desk.send}
      disabled={!app.me || desk.sending || !desk.draft.trim()} onclick={() => desk.send()}><SendHorizontal size={20} /></button>
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
  .filter { position: relative; }
  .tool {
    position: relative; width: 36px; height: 36px; border: 1px solid var(--color-blue-300); border-radius: var(--radius-md); background: var(--color-paper);
    color: var(--color-ink); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
  }
  .tool.active { border-color: var(--color-ink); background: var(--color-blue-100); }
  .dot { position: absolute; top: 5px; right: 5px; width: 7px; height: 7px; border-radius: 50%; background: var(--color-ink); }
  .menu {
    position: absolute; right: 0; top: calc(100% + 4px); z-index: 3; min-width: 150px; display: flex; flex-direction: column; padding: 4px;
    --color-paper: var(--color-raised); border: 1px solid var(--color-blue-300); border-radius: var(--radius-md); background: var(--color-paper);
    box-shadow: 0 0 0 1px var(--color-raised-edge), 0 4px 12px rgb(0 56 105 / 0.15);
  }
  .menu button { min-height: 32px; padding: 0 10px; border: 0; border-radius: var(--radius-md); background: none; color: var(--color-ink); font: inherit; font-size: 14px; text-align: left; cursor: pointer; }
  .menu button:hover { background: var(--color-blue-100); }
  .menu button[aria-checked="true"] { font-weight: 700; background: var(--color-blue-100); }
  .tool:focus-visible, .menu button:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 2px; }
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

  /* input and send button as on the board (Composer) */
  .compose { flex: none; display: flex; align-items: flex-end; gap: 6px; padding: 10px; border-top: 1px solid var(--color-blue-100); }
  textarea {
    flex: 1; min-width: 0; min-height: 40px; max-height: 132px; box-sizing: border-box; padding: 9px 10px; border: 1px solid var(--color-blue-300);
    border-radius: var(--radius-md); background: var(--color-paper); color: var(--color-ink); font: inherit; font-size: 14px; line-height: 20px; resize: none;
  }
  textarea:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 0; }
  .send {
    width: 44px; height: 40px; flex: none; display: grid; place-items: center; border: 0; border-radius: var(--radius-md);
    background: var(--color-ink); color: var(--color-paper); cursor: pointer;
  }
  .send:hover:not(:disabled) { background: var(--color-ink-soft); }
  .send:disabled { opacity: 0.45; cursor: default; }
  .send:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 2px; }
</style>

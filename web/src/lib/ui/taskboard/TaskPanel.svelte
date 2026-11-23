<script lang="ts">
  // the sidebar of a task board (#29), in the place of the board: on top asking in one line (with chips and @ for a
  // particular person; only from inside the room), below the three lanes of the board as sections.
  import X from "@lucide/svelte/icons/x";
  import { TASK_LIMITS, type TaskPerson, type TaskRequest } from "@ruumble/protocol";
  import { t } from "../../i18n/index.svelte.ts";
  import type { RuumbleState } from "../../state.svelte.ts";
  import { boardLook, flagIsNew, lanes, mentionable, mentionQuery } from "../../taskboard/model.ts";
  import TaskBoardGraphic from "./TaskBoardGraphic.svelte";
  import TaskCard from "./TaskCard.svelte";
  import ThanksDialog from "./ThanksDialog.svelte";

  let { app }: { app: RuumbleState } = $props();

  const tb = $derived(t().taskboard);
  const board = $derived(app.taskboard);
  const channelId = $derived(board.channelId!);
  const room = $derived(board.view?.name ?? app.snapshot?.channels.find((c) => c.id === channelId)?.name ?? "");
  const me = $derived<TaskPerson | null>(app.me?.person ? { person: app.me.person, name: app.me.name } : null);
  const inRoom = $derived(app.me?.channel === channelId);
  const groups = $derived(lanes(board.view?.requests ?? []));
  const summary = $derived(app.snapshot?.taskboards?.[String(channelId)] ?? null);

  let now = $state(Date.now());
  $effect(() => {
    const timer = setInterval(() => (now = Date.now()), 30_000);
    return () => clearInterval(timer);
  });

  // asking: one line; chips; @ picks a person, who then stands as a chip in front of the field
  let text = $state("");
  let until = $state("");
  let untilOn = $state(false);
  let talk = $state(false);
  let look = $state(false);
  let target = $state<{ person: string; name: string } | null>(null);
  let field = $state<HTMLInputElement | null>(null);
  let pick = $state(0);
  const query = $derived(mentionQuery(text));
  const candidates = $derived(query === null || target ? [] : mentionable(app.snapshot, channelId, query));
  $effect(() => {
    void candidates.length;
    pick = 0;
  });

  function choose(c: { person: string; name: string }): void {
    target = { person: c.person, name: c.name };
    text = text.replace(/(^|\s)@[^\s@]*$/, "$1").trimEnd();
    field?.focus();
  }

  function keydown(e: KeyboardEvent): void {
    if (candidates.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      pick = (pick + (e.key === "ArrowDown" ? 1 : candidates.length - 1)) % candidates.length;
    } else if (candidates.length && (e.key === "Enter" || e.key === "Tab")) {
      e.preventDefault();
      choose(candidates[pick]!);
    } else if (e.key === "Backspace" && !text && target) {
      target = null;
    }
  }

  async function submit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    if (!text.trim() || board.busy) return;
    const ok = await board.ask({
      text: text.trim(),
      ...(untilOn && until ? { until } : {}),
      ...(talk ? { talk: true } : {}),
      ...(look ? { look: true } : {}),
      ...(target ? { target: target.person } : {}),
    });
    if (!ok) return;
    text = "";
    untilOn = talk = look = false;
    until = "";
    target = null;
  }

  /** where a person is now: their channel, while their plugin is connected */
  const whereIs = (person: string) => app.snapshot?.users.find((u) => u.person === person) ?? null;
  const present = (person: string) => whereIs(person) !== null;
  function goTo(r: TaskRequest): (() => void) | undefined {
    const asker = whereIs(r.asker.person);
    if (!asker || asker.channel === app.me?.channel || app.snapshot?.canEnter[String(asker.channel)] === false) return undefined;
    return () => void app.join(asker.channel);
  }
  function message(r: TaskRequest): (() => void) | undefined {
    return present(r.asker.person) ? () => app.chat.open(r.asker.person, r.asker.name) : undefined;
  }
</script>

<aside id="taskboard-panel" class="panel" class:floating={app.boardFloating} class:left={app.boardFloating && app.boardSide === "left"} aria-label={tb.of(room)}>
  <header>
    {#if summary}<TaskBoardGraphic look={boardLook(summary, board.view?.equipment.waveMinutes ?? 30, now)} open={summary.open} helping={summary.helping.length} fresh={flagIsNew(summary, now)} width={30} />{/if}
    <h2>{tb.of(room)}</h2>
    <button type="button" class="tool" aria-label={tb.close} title={tb.close} onclick={() => board.close()}><X size={18} /></button>
  </header>

  {#if inRoom}
    <form class="ask" onsubmit={submit} aria-label={tb.ask}>
      <div class="row">
        <div class="input">
          {#if target}<button type="button" class="target" title={tb.to(target.name)} onclick={() => (target = null)}>{tb.to(target.name)} <X size={12} aria-hidden="true" /></button>{/if}
          <input
            bind:this={field}
            bind:value={text}
            onkeydown={keydown}
            maxlength={TASK_LIMITS.textChars}
            placeholder={tb.askPlaceholder}
            aria-label={tb.askPlaceholder}
            aria-describedby="taskboard-hint"
            autocomplete="off"
            role="combobox"
            aria-expanded={candidates.length > 0}
            aria-controls="taskboard-mentions"
            aria-autocomplete="list"
          />
        </div>
        <button type="submit" class="send" disabled={!text.trim() || board.busy}>{board.busy ? tb.asking : tb.ask}</button>
      </div>
      {#if candidates.length}
        <ul id="taskboard-mentions" class="mentions" role="listbox" aria-label={tb.mentionHint}>
          {#each candidates as c, i (c.person)}
            <li role="option" aria-selected={i === pick}>
              <button type="button" tabindex="-1" onmousedown={(e) => { e.preventDefault(); choose(c); }}>{c.name}{#if c.here}<em>{tb.inRoom}</em>{/if}</button>
            </li>
          {/each}
        </ul>
      {/if}
      <div class="chips">
        <label class="chip" class:on={untilOn}>
          <input type="checkbox" bind:checked={untilOn} />{tb.until}
          {#if untilOn}<input type="time" class="time" bind:value={until} aria-label={tb.until} />{/if}
        </label>
        <label class="chip" class:on={talk}><input type="checkbox" bind:checked={talk} />{tb.talk}</label>
        <label class="chip" class:on={look}><input type="checkbox" bind:checked={look} />{tb.look}</label>
      </div>
      <p class="hint" id="taskboard-hint">{tb.mentionHint}</p>
    </form>
  {:else}
    <p class="hint outside">{tb.onlyInRoom(room)}</p>
  {/if}

  <div class="lanes">
    {#if board.error}
      <p class="empty">{tb.unavailable}</p>
    {:else if board.view}
      {#if !board.view.requests.length}
        <p class="empty">{tb.empty}</p>
      {:else}
        {#each [["open", groups.open], ["helping", groups.helping], ["done", groups.done]] as const as [lane, list] (lane)}
          {#if list.length || lane === "open"}
            <section class="lane" aria-labelledby="lane-{lane}">
              <h3 id="lane-{lane}"><span class="dot {lane}" aria-hidden="true"></span>{tb.lanes[lane]} · {list.length}</h3>
              {#each list as r (r.id)}
                <TaskCard request={r} {me} {now} {present} onact={(action) => void board.act(r, action)} onthank={() => (board.thanking = r)} ongo={goTo(r)} onmessage={message(r)} />
              {:else}
                <p class="empty small">{tb.emptyOpen}</p>
              {/each}
            </section>
          {/if}
        {/each}
      {/if}
    {/if}
  </div>
</aside>

{#if board.thanking}<ThanksDialog {app} request={board.thanking} />{/if}

<style>
  .panel {
    --color-paper: var(--color-card); position: relative; flex-shrink: 0; width: var(--board-width); display: flex; flex-direction: column;
    min-height: 0; background: var(--color-board);
  }
  .panel.floating {
    position: absolute; z-index: 4; top: var(--wall); bottom: var(--wall); right: var(--wall);
    box-shadow: 0 0 0 var(--wall) var(--color-wall), 0 12px 32px rgb(0 20 45 / 0.35);
  }
  .panel.floating.left { right: auto; left: var(--wall); }
  header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--color-blue-300); }
  h2 { flex: 1; min-width: 0; margin: 0; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tool { width: 36px; height: 36px; border: 1px solid var(--color-blue-300); border-radius: var(--radius-md); background: var(--color-paper); color: var(--color-ink); display: flex; align-items: center; justify-content: center; cursor: pointer; flex: none; }
  .tool:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 2px; }
  .ask { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 12px; border-bottom: 1px solid var(--color-blue-300); }
  .row { display: flex; gap: 6px; }
  .input { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; padding: 0 8px; border: 1.5px solid var(--color-ink); border-radius: var(--radius-md); background: var(--color-paper); }
  .input:focus-within { outline: 3px solid var(--color-sky); outline-offset: 0; }
  .input input { flex: 1; min-width: 0; height: 36px; border: 0; outline: 0; background: none; font: inherit; font-size: 14px; color: var(--color-ink); }
  .target { flex: none; display: inline-flex; align-items: center; gap: 2px; padding: 1px 6px; border: 0; border-radius: 4px; background: var(--color-help-tint); color: var(--color-link); font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
  .send { flex: none; padding: 0 14px; border: 0; border-radius: var(--radius-md); background: var(--color-ink); color: var(--color-paper); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
  .send:disabled { opacity: 0.5; cursor: default; }
  .send:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 2px; }
  .mentions {
    position: absolute; z-index: 3; left: 12px; top: 54px; min-width: 220px; margin: 0; padding: 4px; list-style: none;
    --color-paper: var(--color-raised); background: var(--color-paper); border: 1px solid var(--color-blue-300); border-radius: var(--radius-md);
    box-shadow: 0 0 0 1px var(--color-raised-edge), 0 4px 12px rgb(0 56 105 / 0.15);
  }
  .mentions button { width: 100%; display: flex; gap: 8px; align-items: center; min-height: 30px; padding: 0 8px; border: 0; border-radius: var(--radius-md); background: none; color: var(--color-ink); font: inherit; font-size: 13.5px; text-align: left; cursor: pointer; }
  .mentions [aria-selected="true"] button, .mentions button:hover { background: var(--color-blue-100); }
  .mentions em { margin-left: auto; font-style: normal; font-size: 11.5px; color: var(--color-blue-700); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { display: inline-flex; align-items: center; gap: 4px; min-height: 26px; padding: 0 10px; border: 1px solid var(--color-blue-300); border-radius: 999px; background: var(--color-paper); color: var(--color-blue-700); font-size: 12.5px; cursor: pointer; }
  .chip:focus-within { outline: 3px solid var(--color-sky); outline-offset: 1px; }
  .chip.on { border-color: var(--color-signal); background: var(--color-signal-tint); color: var(--color-ink); font-weight: 600; }
  .chip input[type="checkbox"] { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .time { height: 22px; border: 1px solid var(--color-blue-300); border-radius: 4px; background: var(--color-paper); color: var(--color-ink); font: inherit; font-size: 12px; }
  .hint { margin: 0; font-size: 12px; color: var(--color-blue-700); }
  .hint.outside { padding: 12px; border-bottom: 1px solid var(--color-blue-300); font-size: 13px; }
  .lanes { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding: 6px 0 16px; }
  .lane { display: flex; flex-direction: column; gap: 8px; padding: 8px 12px; }
  .lane h3 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-blue-700); }
  .dot { width: 9px; height: 9px; border-radius: 50%; }
  .dot.open { background: var(--color-signal); }
  .dot.helping { background: var(--color-sky); }
  .dot.done { background: var(--color-leaf); }
  .empty { margin: 12px; font-size: 14px; color: var(--color-blue-700); }
  .empty.small { margin: 0; font-size: 13px; }
</style>

<script lang="ts">
  // one request on the task board (#29): who asks (and who has +1), for whom, since when, the chips, the text; the
  // buttons the own user may use right now (the same rules as the service). A helper also gets the way to the asker.
  import type { TaskAction, TaskPerson, TaskRequest } from "@ruumble/protocol";
  import { relativeTime } from "../../board/model.ts";
  import { t } from "../../i18n/index.svelte.ts";
  import { may, mayThank, names } from "../../taskboard/model.ts";
  import ThanksMotif from "./ThanksMotif.svelte";

  let {
    request,
    me,
    now,
    present,
    onact,
    onthank,
    ongo,
    onmessage,
  }: {
    request: TaskRequest;
    me: TaskPerson | null;
    now: number;
    /** whether a person is in the building right now (their plugin is connected) */
    present: (person: string) => boolean;
    onact: (action: TaskAction) => void;
    onthank: () => void;
    /** go to the asker's room; given when they are in another room the own user may enter */
    ongo?: () => void;
    /** a quiet word to the asker */
    onmessage?: () => void;
  } = $props();

  const tb = $derived(t().taskboard);
  const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
  const people = $derived([request.asker, ...request.plus]);
  const plussed = $derived(!!me && request.plus.some((p) => p.person === me.person));
  const amHelper = $derived(!!me && request.helper?.person === me.person);
  const askerAway = $derived(request.state !== "done" && !present(request.asker.person));
  const busyLine = $derived(
    request.state === "helping" && request.helper ? tb.helps(request.helper.name, request.asker.name)
    : request.state === "done" ? (request.helper ? tb.helped(request.helper.name, request.asker.name) : tb.solvedSelf(request.asker.name))
    : names(people.map((p) => p.name)),
  );
  const when = $derived(relativeTime(request.state === "open" ? request.createdAt : (request.doneAt ?? request.changedAt), now));
</script>

<article class="card {request.state}" data-request={request.id} aria-label={request.text}>
  <div class="who">
    <span class="stack" aria-hidden="true">
      {#if request.state === "open"}
        {#each people.slice(0, 3) as p (p.person)}<span class="mini">{initials(p.name)}</span>{/each}
      {:else}
        <span class="mini" class:helper={!!request.helper}>{initials((request.helper ?? request.asker).name)}</span>
      {/if}
    </span>
    <span class="line">{busyLine}</span>
    {#if request.target && request.state === "open"}<span class="to">{tb.to(request.target.name)}</span>{/if}
    <span class="when">· {when}</span>
    {#if request.until && request.state !== "done"}<span class="until">· {tb.untilTime(request.until)}</span>{/if}
    {#if askerAway}<span class="away">· {tb.away}</span>{/if}
  </div>
  <p class="what">{request.text}</p>
  {#if (request.talk || request.look) && request.state !== "done"}
    <div class="chips">
      {#if request.talk}<span class="chip">{tb.talk}</span>{/if}
      {#if request.look}<span class="chip">{tb.look}</span>{/if}
    </div>
  {/if}
  {#if request.thanks}
    <div class="thanks">
      <span class="tile motif-{request.thanks.motif}"><ThanksMotif motif={request.thanks.motif} size={22} /></span>
      <span>{request.thanks.text ? t().taskboard.thanks.quoted(request.thanks.text) : t().taskboard.thanks.motifs[request.thanks.motif]}</span>
    </div>
  {/if}
  <div class="acts">
    {#if may(request, "take", me)}<button type="button" class="btn go" onclick={() => onact("take")}>{tb.take}</button>{/if}
    {#if amHelper && ongo}<button type="button" class="btn" onclick={ongo}>{tb.goTo(request.asker.name)}</button>{/if}
    {#if amHelper && onmessage}<button type="button" class="btn" onclick={onmessage}>{tb.message}</button>{/if}
    {#if plussed}
      <button type="button" class="btn plus on" title={tb.plusMineTitle} onclick={() => onact("unplus")}>{tb.plusMine}</button>
    {:else if may(request, "plus", me)}
      <button type="button" class="btn plus" title={tb.plusTitle} onclick={() => onact("plus")}>{tb.plus}</button>
    {/if}
    {#if may(request, "done", me)}<button type="button" class="btn" onclick={() => onact("done")}>{tb.done}</button>{/if}
    {#if may(request, "back", me)}<button type="button" class="btn quiet" onclick={() => onact("back")}>{tb.back}</button>{/if}
    {#if may(request, "solved", me)}<button type="button" class="btn quiet" onclick={() => onact("solved")}>{tb.solved}</button>{/if}
    {#if mayThank(request, me)}<button type="button" class="btn thank" onclick={onthank}>{tb.thank}</button>{/if}
    {#if may(request, "reopen", me)}<button type="button" class="btn quiet" onclick={() => onact("reopen")}>{tb.reopen}</button>{/if}
  </div>
</article>

<style>
  .card { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid var(--color-blue-300); border-radius: var(--radius-md); background: var(--color-paper); }
  .card.open { background: var(--color-signal-tint); border-color: var(--color-signal); }
  .card.helping { background: var(--color-help-tint); }
  .card.done { background: var(--color-done-tint); padding: 8px 12px; }
  .who { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 6px; font-size: 12.5px; color: var(--color-blue-700); }
  .line { font-weight: 600; color: var(--color-ink); }
  .stack { display: flex; }
  .mini {
    width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; flex: none; margin-left: -6px;
    background: var(--color-blue-500); color: var(--color-white); font-size: 10px; font-weight: 700; border: 2px solid var(--color-paper); box-sizing: content-box;
  }
  .mini:first-child { margin-left: 0; }
  .mini.helper { background: var(--color-sky); }
  .to { padding: 0 7px; border: 1px solid var(--color-blue-300); border-radius: 999px; background: var(--color-paper); color: var(--color-ink); font-weight: 600; font-size: 11.5px; }
  .until { color: var(--color-signal-ink); font-weight: 700; }
  .away { font-style: italic; }
  .what { margin: 0; font-size: 14px; font-weight: 500; color: var(--color-ink); overflow-wrap: anywhere; }
  .done .what { font-weight: 400; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .chip { padding: 0 8px; border: 1px solid var(--color-blue-300); border-radius: 999px; font-size: 11.5px; color: var(--color-blue-700); background: var(--color-paper); }
  .thanks { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-ink); }
  .tile { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; flex: none; }
  .acts { display: flex; flex-wrap: wrap; gap: 6px; }
  .acts:empty { display: none; }
  .btn {
    min-height: 28px; padding: 2px 10px; border: 1px solid var(--color-blue-300); border-radius: var(--radius-md); background: var(--color-paper);
    color: var(--color-ink); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
  }
  .btn:hover { background: var(--color-blue-100); }
  .btn:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 2px; }
  .btn.go { background: var(--color-signal-ink); border-color: var(--color-signal-ink); color: var(--color-signal-on); }
  .btn.go:hover { filter: brightness(1.08); }
  .btn.plus.on { background: var(--color-signal-tint); border-color: var(--color-signal); }
  .btn.thank { border-color: var(--color-leaf); }
  .btn.quiet { border-color: transparent; background: transparent; color: var(--color-link); }
  .btn.quiet:hover { background: var(--color-blue-100); }
  .motif-coffee { background: #f3e6d8; } .motif-cake { background: #fbe3ea; } .motif-rocket { background: #e3effa; } .motif-trophy { background: #fbf1c9; }
  .motif-flowers { background: #e6f2ea; } .motif-high-five { background: #ece6f6; } .motif-lifebuoy { background: #fdeedf; } .motif-star { background: #fff6c2; }
</style>

<script lang="ts">
  import FileIcon from "@lucide/svelte/icons/file";
  import Package from "@lucide/svelte/icons/package";
  import Users from "@lucide/svelte/icons/users";
  import { TUBE_LIMITS } from "@ruumble/protocol";
  import { formatSize } from "../../board/model.ts";
  import { t } from "../../i18n/index.svelte.ts";
  import type { RuumbleState } from "../../state.svelte.ts";
  import { candidates, roomChoices, toggleRoom, togglePerson, typeLabel, withoutRuumble } from "../../tube/model.ts";
  import CareShell from "../care/CareShell.svelte";

  // Tube mail (ADR-0022): send a file. The file (chosen, or dropped here or on a room), rooms as a quick choice of
  // their people with Ruumble at this moment, the people one by one, and a note. Those without Ruumble are listed
  // greyed: they cannot get tube mail. The file stays in this tab; the dialog closes once the parcel is offered.
  let { app }: { app: RuumbleState } = $props();

  const draft = $derived(app.tube.draft!);
  const people = $derived(candidates(app.snapshot, app.tube.me));
  const rooms = $derived(roomChoices(people, app.me?.channel ?? null));
  const others = $derived(withoutRuumble(app.snapshot));
  const ready = $derived(!!draft.file && draft.to.length > 0 && !app.tube.busy);
  // what is still missing before it can go
  const missing = $derived(!draft.file ? t().tube.dialog.choose : draft.to.length === 0 ? t().tube.dialog.choosePeople : "");
  let picker = $state<HTMLInputElement | null>(null);
  let dragging = $state(false);
  let form = $state<HTMLFormElement | null>(null);

  // on opening, the first step instead of the close button: the file, or the people when the file came along (dropped
  // on a room), or the note when they are chosen too. A frame later, after the frame's showModal() placed the focus.
  $effect(() => {
    const frame = requestAnimationFrame(() => {
      const start = !draft.file ? ".dropzone" : draft.to.length === 0 ? ".people input" : "#tube-note";
      form?.querySelector<HTMLElement>(start)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  });

  function pick(e: Event): void {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (file) app.tube.setFile(file);
  }

  function over(e: DragEvent): void {
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    dragging = true;
  }

  function drop(e: DragEvent): void {
    e.preventDefault();
    dragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) app.tube.setFile(file);
  }

  function submit(e: SubmitEvent): void {
    e.preventDefault();
    if (ready) void app.tube.send();
  }
</script>

<CareShell title={t().tube.dialog.title} level="tube" narrow onclose={() => app.tube.closeDraft()}
  houseRule={t().tube.dialog.limit(formatSize(TUBE_LIMITS.fileBytes))} status={app.tube.error ? { text: app.tube.error, error: true } : null}>
  {#snippet glyph()}<span class="glyph"><Package size={30} /></span>{/snippet}
  {#snippet actions()}
    <button type="submit" form="tube-form" class="btn primary" disabled={!ready} aria-describedby={missing ? "tube-missing" : undefined}>{t().tube.dialog.send(draft.to.length)}</button>
  {/snippet}
  <form id="tube-form" bind:this={form} onsubmit={submit}>
    <input bind:this={picker} id="tube-file" class="picker" type="file" onchange={pick} tabindex="-1" aria-hidden="true" />
    {#if draft.file}
      <div class="file" class:dragging role="group" aria-label={draft.file.name} ondragover={over} ondragleave={() => (dragging = false)} ondrop={drop}>
        <FileIcon size={22} aria-hidden="true" />
        <span class="fname">{draft.file.name}</span>
        <span class="meta">{[typeLabel(draft.file.name, draft.file.type), formatSize(draft.file.size)].filter(Boolean).join(" · ")}</span>
        <button type="button" class="btn secondary compact" onclick={() => picker?.click()}>{t().tube.dialog.change}</button>
      </div>
    {:else}
      <button type="button" class="dropzone" class:dragging onclick={() => picker?.click()} ondragover={over} ondragleave={() => (dragging = false)} ondrop={drop}>
        <Package size={26} aria-hidden="true" />
        <span>{t().tube.dialog.drop}</span>
      </button>
    {/if}

    <fieldset>
      <legend>{t().tube.dialog.to}</legend>
      {#if !people.length}
        <p class="muted">{t().tube.dialog.nobody}</p>
      {:else}
        {#if rooms.length > 1 || rooms[0]?.people.length !== people.length}
          <div class="rooms" role="group" aria-label={t().tube.dialog.rooms}>
            {#each rooms as room (room.channelId)}
              {@const all = room.people.every((p) => draft.to.includes(p))}
              {@const hint = t().tube.dialog.everyoneIn(room.name, room.people.length)}
              <button type="button" class="chip" aria-pressed={all} aria-label={hint} title={hint} onclick={() => app.tube.setRecipients(toggleRoom(draft.to, room))}>
                {room.name}<span class="n" aria-hidden="true"><Users size={13} />{room.people.length}</span>
              </button>
            {/each}
          </div>
        {/if}
        <ul class="people" aria-label={t().tube.dialog.people}>
          {#each people as p (p.person)}
            <li>
              <label>
                <input type="checkbox" checked={draft.to.includes(p.person)} onchange={() => app.tube.setRecipients(togglePerson(draft.to, p.person))} />
                <span class="pname">{p.name}</span>
                <span class="place">{p.place}</span>
              </label>
            </li>
          {/each}
        </ul>
      {/if}
      {#if others.length}<p class="muted without">{others.join(", ")} – {t().tube.dialog.noRuumble}</p>{/if}
    </fieldset>

    <div class="field">
      <label for="tube-note">{t().tube.dialog.note}</label>
      <textarea id="tube-note" rows="2" maxlength={TUBE_LIMITS.noteChars} placeholder={t().tube.dialog.notePlaceholder} value={draft.note} oninput={(e) => app.tube.setNote(e.currentTarget.value)}></textarea>
    </div>

    <!-- what is still missing, right above the send button in the footer -->
    {#if missing}<p id="tube-missing" class="muted missing">{missing}</p>{/if}
  </form>
</CareShell>

<style>
  .glyph { display: inline-flex; color: var(--ink); }
  form { display: flex; flex-direction: column; gap: 16px; }
  .picker { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .dropzone {
    display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px 16px; border: 2px dashed var(--control); border-radius: 6px;
    background: var(--paper); color: var(--muted); font: inherit; font-size: 14px; cursor: pointer;
  }
  .dropzone:hover, .dropzone.dragging { border-color: var(--ink); background: var(--tint); color: var(--ink); }
  .file.dragging { outline: 2px dashed var(--ink); outline-offset: 2px; }
  .file { display: grid; grid-template-columns: auto 1fr auto; grid-template-rows: auto auto; align-items: center; gap: 2px 12px; padding: 10px 12px; border-radius: 6px; background: var(--tint); }
  .file :global(svg) { grid-row: span 2; }
  .fname { font-weight: 700; overflow-wrap: anywhere; }
  .meta { grid-column: 2; font-size: 13px; color: var(--muted); }
  .file .btn { grid-column: 3; grid-row: 1 / span 2; }
  fieldset { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  legend, label[for] { font-size: 13px; font-weight: 700; padding: 0; margin-bottom: 4px; }
  .rooms { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 12px; border: 1px solid var(--control); border-radius: 16px;
    background: var(--paper); color: var(--ink); font: inherit; font-size: 13px; cursor: pointer;
  }
  .chip:hover { background: var(--tint); }
  .chip[aria-pressed="true"] { border-color: var(--ink); background: var(--ink); color: var(--paper); }
  .chip .n { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 700; opacity: 0.7; font-variant-numeric: tabular-nums; }
  .people { max-height: 220px; overflow-y: auto; margin: 0; padding: 4px; list-style: none; border: 1px solid var(--control); border-radius: 6px; }
  .people label { display: flex; align-items: center; gap: 10px; min-height: 36px; padding: 0 8px; border-radius: 4px; cursor: pointer; }
  .people label:hover { background: var(--tint); }
  .people input { width: 18px; height: 18px; margin: 0; accent-color: var(--ink); }
  .pname { font-weight: 700; }
  .place { margin-left: auto; font-size: 13px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .muted { margin: 0; font-size: 13px; color: var(--muted); }
  .without { opacity: 0.8; }
  .field { display: flex; flex-direction: column; }
  textarea { padding: 8px 10px; border: 1px solid var(--control); border-radius: 4px; font: inherit; color: var(--ink); background: var(--paper); resize: vertical; }
  .missing { text-align: right; }
  .btn.compact { height: 32px; padding: 0 12px; font-size: 13px; }
</style>

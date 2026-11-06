<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import type { Channel } from "@ruumble/protocol";
  import { renderMarkdown } from "../board/render.ts";
  import { t } from "../i18n/index.svelte.ts";
  import { applied, changesOf, formOf, formProblem, type ChannelForm } from "../model/roomEdit.ts";
  import type { RuumbleState } from "../state.svelte.ts";
  import { showModal } from "./modal.ts";

  // Ruumble's edit dialog for a room or floor (#15): name, description in Markdown (stored as plain text with the
  // marker line, never as HTML), maximum users. The change goes through Ruumble Client to Mumble; the dialog waits
  // until the client's channel shows it, then closes. Password, position and ACL stay in Mumble.
  let { app, channel, kind }: { app: RuumbleState; channel: Channel; kind: "room" | "floor" } = $props();

  const WAIT_MS = 6000;
  const POLL_MS = 300;

  let dialog: HTMLDialogElement;
  $effect(() => showModal(dialog, () => close()));

  // the form starts from the snapshot; the maximum users only the client knows
  // svelte-ignore state_referenced_locally
  let before = $state<ChannelForm>(formOf(channel, 0));
  // svelte-ignore state_referenced_locally
  let form = $state<ChannelForm>(formOf(channel, 0));
  let tab = $state<"write" | "preview">("write");
  let busy = $state(false);
  let error = $state<string | null>(null);
  $effect(() => {
    void app.desk.channelProperties(channel.id).then((p) => {
      if (!p) return;
      before = { ...before, maxUsers: p.maxUsers };
      form = { ...form, maxUsers: p.maxUsers };
    });
  });

  const problem = $derived(formProblem(form, channel, app.snapshot?.channels ?? []));
  const changes = $derived(changesOf(before, form));
  const changed = $derived(Object.keys(changes).length > 0);
  const preview = $derived(form.description.trim() ? renderMarkdown(form.description) : "");
  const title = $derived(kind === "room" ? t().roomEdit.titleRoom(channel.name) : t().roomEdit.titleFloor(channel.name));

  function close(): void {
    app.editChannelId = null;
  }

  async function save(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    if (busy || problem || !changed) return;
    busy = true;
    error = null;
    const sent = changes;
    const result = await app.desk.updateChannel(channel.id, { ...sent });
    if (!result.sent) {
      busy = false;
      error = t().roomEdit.notSent;
      return;
    }
    for (let waited = 0; waited < WAIT_MS; waited += POLL_MS) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      const now = await app.desk.channelProperties(channel.id);
      if (now && applied(sent, result.descriptionHash, now)) {
        close();
        return;
      }
    }
    busy = false;
    error = t().roomEdit.notApplied;
  }
</script>

<dialog bind:this={dialog} class="edit" aria-labelledby="edit-title">
  <form onsubmit={save}>
    <header>
      <h2 id="edit-title">{title}</h2>
      <button type="button" class="close" aria-label={t().common.close} title={t().common.close} onclick={close}><X size={18} /></button>
    </header>
    <div class="fields">
      <label class="field">
        <span class="caption">{t().roomEdit.name}</span>
        <input type="text" bind:value={form.name} maxlength="120" required aria-invalid={problem === "name-empty" || problem === "name-taken"} />
      </label>

      <div class="field">
        <div class="desc-head">
          <span class="caption" id="desc-caption">{t().roomEdit.description}</span>
          <div class="tabs" role="tablist" aria-labelledby="desc-caption">
            <button type="button" role="tab" aria-selected={tab === "write"} onclick={() => (tab = "write")}>{t().roomEdit.write}</button>
            <button type="button" role="tab" aria-selected={tab === "preview"} onclick={() => (tab = "preview")}>{t().roomEdit.preview}</button>
          </div>
        </div>
        {#if tab === "write"}
          <textarea bind:value={form.description} rows="9" aria-labelledby="desc-caption" spellcheck="true"></textarea>
        {:else}
          <div class="preview md" role="tabpanel" aria-labelledby="desc-caption">
            {#if preview}{@html preview}{:else}<p class="empty">{t().roomEdit.emptyPreview}</p>{/if}
          </div>
        {/if}
        <p class="hint">{t().roomEdit.markdownHint}</p>
      </div>

      <label class="field narrow">
        <span class="caption">{t().roomEdit.maxUsers}</span>
        <input type="number" min="0" step="1" bind:value={form.maxUsers} aria-invalid={problem === "max-users"} />
        <span class="hint">{t().roomEdit.maxUsersHint}</span>
      </label>

      {#if problem && changed}<p class="problem" role="alert">{t().roomEdit.problems[problem]}</p>{/if}
      {#if error}<p class="problem" role="alert">{error}</p>{/if}
      <p class="hint">{kind === "room" ? t().roomEdit.mumbleHintRoom : t().roomEdit.mumbleHintFloor}</p>
    </div>
    <footer>
      <button type="button" class="secondary" onclick={close}>{t().roomEdit.cancel}</button>
      <button type="submit" class="primary" disabled={busy || !!problem || !changed}>{busy ? t().roomEdit.saving : t().roomEdit.save}</button>
    </footer>
  </form>
</dialog>

<style>
  .edit {
    --color-paper: var(--color-raised); box-shadow: var(--dialog-frame);
    width: min(620px, calc(100vw - 32px)); max-height: 90vh; padding: 0; border: 0; border-top: var(--dialog-band); border-radius: var(--radius-md);
    color: var(--color-ink); background: var(--color-paper);
  }
  .edit::backdrop { background: var(--color-backdrop); }
  form { display: flex; flex-direction: column; max-height: inherit; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 10px 10px 20px; border-bottom: 1px solid var(--color-blue-100); }
  h2 { margin: 0; font-size: 17px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .close { flex: none; width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: var(--radius-md); background: transparent; color: var(--color-ink); cursor: pointer; }
  .close:hover { background: var(--color-blue-100); }
  .fields { display: flex; flex-direction: column; gap: 16px; padding: 16px 20px; overflow-y: auto; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field.narrow { max-width: 240px; }
  .caption { font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-link); }
  input, textarea {
    font: inherit; font-size: 14px; color: var(--color-ink); background: var(--color-paper);
    padding: 8px 10px; border: 1px solid var(--color-blue-300); border-radius: var(--radius-md); box-sizing: border-box; width: 100%;
  }
  textarea { resize: vertical; min-height: 160px; font-family: var(--font-mono); font-size: 13px; line-height: 1.5; }
  input[aria-invalid="true"] { border-color: var(--color-alert); }
  .desc-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .tabs { display: flex; border: 1px solid var(--color-blue-300); border-radius: var(--radius-md); overflow: hidden; }
  .tabs button { border: 0; padding: 4px 12px; font: inherit; font-size: 12px; font-weight: 700; background: none; color: var(--color-ink); cursor: pointer; }
  .tabs button + button { border-left: 1px solid var(--color-blue-300); }
  .tabs button[aria-selected="true"] { background: var(--color-ink); color: var(--color-paper); }
  .preview { min-height: 160px; max-height: 320px; overflow-y: auto; padding: 8px 12px; border: 1px solid var(--color-blue-100); border-radius: var(--radius-md); background: var(--color-surface); font-size: 14px; }
  .preview :global(:first-child) { margin-top: 0; }
  .preview :global(a) { color: var(--color-link); }
  .preview :global(h1) { font-size: 20px; }
  .preview :global(h2) { font-size: 17px; }
  .preview :global(h3) { font-size: 15px; }
  .empty { color: var(--color-blue-700); }
  .hint { margin: 0; font-size: 12px; color: var(--color-blue-700); }
  .problem { margin: 0; font-size: 13px; font-weight: 700; color: var(--color-alert); }
  footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--color-blue-100); }
  footer button { min-height: 38px; padding: 0 16px; border-radius: var(--radius-md); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
  .secondary { border: 1px solid var(--color-blue-300); background: var(--color-paper); color: var(--color-ink); }
  .primary { border: 1px solid var(--color-ink); background: var(--color-ink); color: var(--color-paper); }
  .primary:disabled { opacity: 0.5; cursor: not-allowed; }
  button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 1px; }
</style>

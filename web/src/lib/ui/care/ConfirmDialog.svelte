<script lang="ts" module>
  import type { IconName } from "./Icon.svelte";

  /** a step that needs a yes first: asked in its own popup above the dialog */
  export interface ConfirmRequest {
    title: string;
    detail: string;
    confirmLabel: string;
    /** danger: deletes for good; neutral: changes that cannot be undone cleanly (moving a board) */
    tone: "danger" | "neutral";
    /** the sign in the badge; by default a warning (danger) or an arrow (neutral) */
    icon?: IconName;
    run: () => Promise<unknown>;
    /** the cancel button's text (default "Cancel") */
    cancelLabel?: string;
    /** a second way out, between cancel and the main action (e.g. "Remove the room" before "Delete with all data") */
    alternative?: { label: string; run: () => Promise<unknown> };
    /** a step that does not close the popup, shown above the buttons (e.g. "Save the board as ZIP first") */
    aside?: { label: string; run: () => Promise<unknown> };
  }
</script>

<script lang="ts">
  import { t } from "../../i18n/index.svelte.ts";
  import Icon from "./Icon.svelte";

  // The confirmation of the care dialogs, the building maintenance and "my keys": a small modal above the dialog,
  // Cancel has the focus, Escape cancels. While the action runs, both buttons and Escape are locked; afterwards the
  // popup closes and the dialog below shows the result.
  let { request, oncancel }: { request: ConfirmRequest; oncancel: () => void } = $props();

  let dialog: HTMLDialogElement;
  let cancelButton: HTMLButtonElement;
  let running = $state(false);
  const id = `confirm-${Math.random().toString(36).slice(2)}`;

  $effect(() => {
    dialog.showModal();
    cancelButton.focus();
    return () => dialog.close();
  });

  function onescape(e: Event): void {
    e.preventDefault();
    if (!running) oncancel();
  }

  async function yes(run: () => Promise<unknown> = request.run): Promise<void> {
    if (running) return;
    running = true;
    try {
      await run();
    } finally {
      running = false;
      oncancel();
    }
  }

  let asideRunning = $state(false);
  async function aside(): Promise<void> {
    if (running || asideRunning || !request.aside) return;
    asideRunning = true;
    try {
      await request.aside.run();
    } finally {
      asideRunning = false;
    }
  }
</script>

<dialog bind:this={dialog} class="confirm {request.tone}" role="alertdialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-detail`} oncancel={onescape}>
  <div class="raster" aria-hidden="true"></div>
  <div class="body">
    <span class="badge" aria-hidden="true">
      <Icon name={request.icon ?? (request.tone === "danger" ? "warning" : "move")} size={22} color={request.tone === "danger" ? "var(--danger)" : "var(--ink)"} />
    </span>
    <div class="text">
      <h3 id={`${id}-title`}>{request.title}</h3>
      <p id={`${id}-detail`}>{request.detail}</p>
      {#if request.aside}
        <button type="button" class="btn secondary aside" disabled={running || asideRunning} aria-busy={asideRunning} onclick={aside}><Icon name="download" color="var(--accent)" />{request.aside.label}</button>
      {/if}
    </div>
  </div>
  <div class="actions">
    <button type="button" class="btn secondary" bind:this={cancelButton} disabled={running} onclick={oncancel}>{request.cancelLabel ?? t().common.cancel}</button>
    {#if request.alternative}
      {@const alternative = request.alternative}
      <button type="button" class="btn secondary" disabled={running} onclick={() => yes(alternative.run)}>{alternative.label}</button>
    {/if}
    <button type="button" class="btn {request.tone === 'danger' ? 'danger-solid' : 'primary'}" disabled={running} aria-busy={running} onclick={() => yes()}>{request.confirmLabel}</button>
  </div>
</dialog>

<style>
  .confirm {
    position: fixed; width: min(460px, calc(100vw - 32px)); padding: 0; border: 1px solid var(--line); border-top: 4px solid var(--danger);
    border-radius: 8px; background: var(--paper); color: var(--ink); overflow: hidden; box-shadow: var(--dialog-frame);
    animation: pop 160ms ease-out;
  }
  .confirm.neutral { border-top-color: var(--ink); }
  .confirm::backdrop { background: var(--color-backdrop-soft); }
  .raster {
    position: absolute; inset: 0 0 auto auto; width: 180px; height: 72px; pointer-events: none;
    background-image: radial-gradient(circle, var(--raster) 2px, transparent 2.4px); background-size: 8px 8px;
    mask-image: linear-gradient(to left, #000 5%, transparent), linear-gradient(to bottom, #000, transparent); mask-composite: intersect;
  }
  .body { position: relative; display: flex; gap: 16px; align-items: flex-start; padding: 24px 24px 20px; }
  .badge { flex: none; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; background: var(--danger-tint); }
  .neutral .badge { background: var(--tint); }
  .text { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .text h3 { margin: 0; font-size: 16px; line-height: 1.3; color: var(--danger-ink); overflow-wrap: anywhere; }
  .neutral .text h3 { color: var(--ink); }
  .text p { margin: 0; font-size: 13px; line-height: 1.5; color: var(--ink-2); }
  .aside { align-self: flex-start; margin-top: 6px; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; padding: 12px 24px; border-top: 1px solid var(--line); background: var(--surface); }
  @keyframes pop { from { opacity: 0; transform: translateY(6px) scale(0.98); } }
  @media (prefers-reduced-motion: reduce) { .confirm { animation: none; } }
</style>

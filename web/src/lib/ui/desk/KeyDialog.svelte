<script lang="ts">
  import Keyboard from "@lucide/svelte/icons/keyboard";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { SUGGESTED_KEY, SUGGESTED_KEYS, keyName, keyText, mouseCode } from "../../desk/transmit.ts";
  import type { DeskTransmit } from "../../desk/transmit.svelte.ts";
  import { t } from "../../i18n/index.svelte.ts";
  import CareShell from "../care/CareShell.svelte";

  // "Set your talk key" (#9 in ruumble-client): the client listens through Mumble's own shortcut engine (on X11 every
  // key and mouse button), the page passes on what it sees itself (the only source on Wayland). Every key pressed while
  // the dialog is open is taken, so it is confirmed with the mouse; Escape cancels. Right Ctrl is suggested.
  let { transmit }: { transmit: DeskTransmit } = $props();

  let suggestion = $state(SUGGESTED_KEY);
  let failed = $state(false);
  let busy = $state(false);
  const captured = $derived(transmit.captured);
  const shown = $derived(captured ? keyText(captured, t().transmit.keyNames) : keyName(suggestion, t().transmit.keyNames));
  const chosen = $derived(captured ? (captured.codes.length === 1 ? captured.codes[0] : null) : suggestion);
  const windowOnly = $derived((captured ?? transmit.key).scope === "window");

  // the page's own capture: every key down until the first one up is one key (a combination like Ctrl + Space)
  $effect(() => {
    const held = new Set<string>();
    const onkeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return; // the dialog's own cancel
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) held.add(e.code);
    };
    const onkeyup = (e: KeyboardEvent) => {
      if (e.key === "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (held.size > 0) {
        failed = false;
        transmit.offer([...held]);
        held.clear();
      }
    };
    const onpointerdown = (e: PointerEvent) => {
      const code = mouseCode(e.button);
      if (!code) return;
      e.preventDefault();
      failed = false;
      transmit.offer([code]);
    };
    window.addEventListener("keydown", onkeydown, true);
    window.addEventListener("keyup", onkeyup, true);
    window.addEventListener("pointerdown", onpointerdown, true);
    return () => {
      window.removeEventListener("keydown", onkeydown, true);
      window.removeEventListener("keyup", onkeyup, true);
      window.removeEventListener("pointerdown", onpointerdown, true);
    };
  });

  function pick(code: string): void {
    suggestion = code;
    failed = false;
    transmit.offer([code]);
  }

  async function accept(): Promise<void> {
    busy = true;
    failed = !(await transmit.accept(suggestion));
    busy = false;
  }
</script>

<CareShell
  title={t().transmit.dialogTitle}
  level="talk-key"
  narrow
  onclose={() => transmit.closeKeyDialog()}
  houseRule={t().transmit.houseRule}
  status={failed ? { text: t().transmit.failed, error: true } : null}
>
  {#snippet glyph()}<span class="glyph"><Keyboard size={30} /></span>{/snippet}
  {#snippet actions()}
    <button type="button" class="btn primary" disabled={busy} onclick={() => void accept()}>{t().transmit.accept(shown)}</button>
  {/snippet}
  <p class="intro">{t().transmit.dialogIntro}</p>
  <div class="capture">
    <kbd class="bigkey" aria-live="polite">{shown}</kbd>
    <span class="listen">{t().transmit.listening}</span>
    <div class="suggest">
      <span>{t().transmit.suggestions}</span>
      {#each SUGGESTED_KEYS as code (code)}
        <button type="button" class="chip" aria-pressed={chosen === code} onclick={() => pick(code)}>{keyName(code, t().transmit.keyNames)}</button>
      {/each}
    </div>
  </div>
  {#if captured?.warn}
    <p class="note warn" role="status"><TriangleAlert size={16} aria-hidden="true" /><span>{t().transmit.warn}</span></p>
  {/if}
  {#if windowOnly}
    <p class="note">{t().transmit.windowNote}</p>
  {/if}
</CareShell>

<style>
  .glyph { display: inline-flex; color: var(--ink); }
  p { margin: 0; }
  .intro { font-size: 14px; color: var(--ink); }
  .capture {
    display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 22px 12px; border: 2px dashed var(--accent-soft);
    border-radius: 8px; background: var(--tint); text-align: center;
  }
  .bigkey {
    min-height: 46px; padding: 8px 18px; box-sizing: border-box; border: 1px solid var(--control); border-bottom-width: 5px; border-radius: 8px;
    background: var(--paper); color: var(--ink); font: inherit; font-size: 20px; font-weight: 700;
  }
  .listen { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--ink-2); }
  .listen::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: blink 1s steps(2) infinite; }
  @keyframes blink { 50% { opacity: 0.2; } }
  .suggest { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-2); }
  .chip { padding: 2px 10px; border: 1px solid var(--control); border-radius: 12px; background: var(--paper); color: var(--ink); font: inherit; font-size: 12px; cursor: pointer; }
  .chip[aria-pressed="true"] { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); font-weight: 700; }
  .chip:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  .note { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; line-height: 1.4; color: var(--ink-2); }
  .note.warn { padding: 8px 10px; border-radius: 6px; background: var(--danger-tint); color: var(--danger-ink); }
  .note :global(svg) { flex: none; margin-top: 1px; }
  @media (prefers-reduced-motion: reduce) {
    .listen::before { animation: none; }
  }
</style>

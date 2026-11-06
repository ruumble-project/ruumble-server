<script lang="ts">
  import AudioLines from "@lucide/svelte/icons/audio-lines";
  import CircleDot from "@lucide/svelte/icons/circle-dot";
  import Globe from "@lucide/svelte/icons/globe";
  import Keyboard from "@lucide/svelte/icons/keyboard";
  import Monitor from "@lucide/svelte/icons/monitor";
  import { TRANSMIT_MODES, keyText, type TransmitMode } from "../../desk/transmit.ts";
  import type { DeskTransmit } from "../../desk/transmit.svelte.ts";
  import { t } from "../../i18n/index.svelte.ts";

  // "How you transmit" (#9 in ruumble-client): hangs below the small tab next to the microphone. The three modes of
  // Mumble, and under push-to-talk everything about the talk key; the rest stays in Mumble's audio settings.
  let {
    transmit,
    muted,
    ontogglemute,
    onsettings,
    onwizard,
    onclose,
  }: {
    transmit: DeskTransmit;
    muted: boolean;
    ontogglemute: () => void;
    onsettings: () => void;
    onwizard: () => void;
    onclose: () => void;
  } = $props();

  const icons: Record<TransmitMode, typeof Keyboard> = { vad: AudioLines, ptt: Keyboard, continuous: CircleDot };
  const key = $derived(transmit.key);

  // the level is sent only while someone looks at it
  $effect(() => {
    transmit.watchLevel(true);
    return () => transmit.watchLevel(false);
  });

  /** a switch shows what the client confirms (no optimistic updates, ADR-0003): it flips back until the answer comes */
  function ask(e: Event & { currentTarget: HTMLInputElement }, current: boolean, change: (on: boolean) => void): void {
    const wanted = e.currentTarget.checked;
    e.currentTarget.checked = current;
    change(wanted);
  }

  function focusChecked(node: HTMLElement): void {
    node.querySelector<HTMLElement>("[aria-checked='true']")?.focus();
  }
</script>

<div id="transmit-menu" class="menu" role="group" aria-label={t().transmit.menuTitle} {@attach focusChecked}>
  <div class="head">{t().transmit.menuTitle}</div>
  <div class="opts" role="radiogroup" aria-label={t().transmit.menuTitle}>
    {#each TRANSMIT_MODES as mode (mode)}
      {@const Icon = icons[mode]}
      <button type="button" class="opt" role="radio" aria-checked={transmit.mode === mode} data-mode={mode} onclick={() => transmit.setMode(mode)}>
        <span class="ic" aria-hidden="true"><Icon size={18} /></span>
        <span class="txt"><b>{t().transmit.modes[mode]}</b><small>{t().transmit.modeHints[mode]}</small></span>
        <span class="radio" aria-hidden="true"></span>
      </button>
    {/each}
  </div>

  {#if transmit.mode === "ptt"}
    <div class="ptt">
      <div class="row">
        <span class="grow">{t().transmit.key}</span>
        <kbd class="keycap" class:none={!key.set}>{key.set ? keyText(key, t().transmit.keyNames) : t().transmit.noKey}</kbd>
        <button type="button" class="link" onclick={() => { onclose(); transmit.openKeyDialog(); }}>
          {key.set ? t().transmit.change : t().transmit.setKey}
        </button>
      </div>
      {#if key.set}
        <p class="scope" class:window={key.scope === "window"}>
          {#if key.scope === "window"}<Monitor size={15} aria-hidden="true" />{:else}<Globe size={15} aria-hidden="true" />{/if}
          <span>{key.scope === "window" ? t().transmit.window : t().transmit.global}</span>
        </p>
      {/if}
      <label class="switch"><input type="checkbox" checked={transmit.latched} onchange={(e) => ask(e, transmit.latched, (on) => transmit.setLatched(on))} /><span class="s" aria-hidden="true"></span>{t().transmit.keepOpen}</label>
      <label class="switch"><input type="checkbox" checked={muted} onchange={(e) => ask(e, muted, ontogglemute)} /><span class="s" aria-hidden="true"></span>{t().transmit.mutedSwitch}</label>
      <label class="switch"><input type="checkbox" checked={transmit.options.doublePush} onchange={(e) => ask(e, transmit.options.doublePush, (on) => transmit.setOption("doublePush", on))} /><span class="s" aria-hidden="true"></span>{t().transmit.doublePush}</label>
      <label class="switch"><input type="checkbox" checked={transmit.options.audioCue} onchange={(e) => ask(e, transmit.options.audioCue, (on) => transmit.setOption("audioCue", on))} /><span class="s" aria-hidden="true"></span>{t().transmit.audioCue}</label>
    </div>
  {/if}

  <div class="lvl">
    <span>{t().transmit.level}</span>
    <span class="track" role="meter" aria-label={t().transmit.level} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(transmit.level * 100)}><i style:width={`${transmit.level * 100}%`}></i></span>
  </div>
  <footer>
    <button type="button" class="link" onclick={() => { onclose(); onsettings(); }}>{t().transmit.moreSettings} <kbd>Ctrl+,</kbd></button>
    <button type="button" class="link" onclick={() => { onclose(); onwizard(); }}>{t().desk.audioWizard}</button>
  </footer>
</div>

<style>
  .menu {
    position: absolute; right: -44px; top: calc(100% + 6px); width: 340px; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px;
    padding: 10px; border-top: 5px solid var(--color-accent); border-radius: 6px; background: var(--color-raised); color: var(--color-ink);
    box-shadow: var(--dialog-frame); z-index: 30; text-align: left;
  }
  .head { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-blue-700); padding: 2px 4px 0; }
  .opts { display: flex; flex-direction: column; gap: 4px; }
  .opt {
    display: grid; grid-template-columns: 34px 1fr 16px; gap: 10px; align-items: center; width: 100%; padding: 7px 8px;
    border: 1px solid transparent; border-radius: 6px; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer;
  }
  .opt:hover { background: var(--color-blue-50); }
  .opt:focus-visible, .link:focus-visible, .switch input:focus-visible + .s { outline: 3px solid var(--color-sky); outline-offset: 2px; }
  .ic { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; background: var(--color-blue-50); color: var(--color-link); }
  .txt b { display: block; font-size: 14px; }
  .txt small { display: block; font-size: 12.5px; line-height: 1.35; color: var(--color-blue-700); }
  .radio { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--color-blue-300); box-sizing: border-box; }
  .opt[aria-checked="true"] { border-color: var(--color-ink); background: var(--color-blue-50); }
  .opt[aria-checked="true"] .ic { background: var(--color-ink); color: var(--color-paper); }
  .opt[aria-checked="true"] .radio { border: 5px solid var(--color-ink); }

  .ptt { display: flex; flex-direction: column; gap: 9px; padding: 10px; border-radius: 6px; background: var(--color-surface); }
  .row { display: flex; align-items: center; gap: 8px; font-size: 14px; }
  .grow { flex: 1; }
  .keycap {
    padding: 1px 7px; border: 1px solid var(--color-blue-300); border-bottom-width: 3px; border-radius: 5px; background: var(--color-paper);
    font: inherit; font-size: 12px; font-weight: 700; white-space: nowrap;
  }
  .keycap.none { color: var(--color-blue-700); font-weight: 400; border-style: dashed; }
  .scope { display: flex; gap: 8px; align-items: flex-start; margin: 0; font-size: 12.5px; line-height: 1.4; color: var(--color-blue-700); }
  .scope :global(svg) { flex: none; margin-top: 2px; color: var(--color-leaf); }
  .scope.window { color: var(--color-ink); }
  .scope.window :global(svg) { color: var(--color-brass); }
  .switch { position: relative; display: flex; align-items: center; gap: 9px; font-size: 13px; cursor: pointer; }
  .switch input { position: absolute; opacity: 0; width: 1px; height: 1px; margin: 0; }
  .s { position: relative; flex: none; width: 30px; height: 18px; border-radius: 9px; background: var(--color-blue-300); transition: background var(--dur) var(--ease-out); }
  .s::after {
    content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--color-white);
    transition: transform var(--dur) var(--ease-out);
  }
  .switch input:checked + .s { background: var(--color-ink); }
  .switch input:checked + .s::after { transform: translateX(12px); background: var(--color-paper); }
  .lvl { display: flex; align-items: center; gap: 8px; padding: 0 4px; font-size: 12px; color: var(--color-blue-700); }
  .track { flex: 1; height: 6px; border-radius: 3px; background: var(--color-blue-100); overflow: hidden; }
  .track i { display: block; height: 100%; width: 0; background: var(--color-sky); transition: width 70ms linear; }
  footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 8px; padding-top: 6px; border-top: 1px solid var(--color-blue-100); }
  .link {
    display: inline-flex; align-items: center; gap: 5px; padding: 3px 4px; border: 0; border-radius: 4px; background: none;
    color: var(--color-link); font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap;
  }
  .link:hover { background: var(--color-blue-100); }
  .link kbd { font: inherit; font-weight: 400; opacity: 0.8; }
  @media (prefers-reduced-motion: reduce) {
    .s, .s::after, .track i { transition: none; }
  }
</style>

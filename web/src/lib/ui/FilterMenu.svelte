<script lang="ts" generics="T extends string">
  import ListFilter from "@lucide/svelte/icons/list-filter";

  // A filter as a menu button (the board, the room tab of Ruumble in a box): a dot on the button while another option
  // than the first is chosen. Closes on a choice, Escape (only the menu, focus back to the button) and a click elsewhere.
  let { options, value, text, label, onchoose }: {
    options: readonly T[];
    value: T;
    /** the option's text in the menu */
    text: (option: T) => string;
    /** the button's accessible name and tooltip */
    label: string;
    onchoose: (option: T) => void;
  } = $props();

  let open = $state(false);
  let root = $state<HTMLElement | null>(null);
  let button = $state<HTMLButtonElement | null>(null);
  const active = $derived(value !== options[0]);

  $effect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!root?.contains(e.target as Node)) open = false; };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  });

  function choose(option: T): void {
    onchoose(option);
    open = false;
    button?.focus();
  }

  function onkeydown(e: KeyboardEvent): void {
    if (e.key !== "Escape") return;
    e.stopPropagation(); // a window around it (Ruumble in a box) closes on Escape too
    open = false;
    button?.focus();
  }
</script>

<div class="filter" bind:this={root}>
  <button
    type="button" class="tool" class:active bind:this={button} aria-haspopup="menu" aria-expanded={open} aria-label={label} title={label}
    onclick={() => (open = !open)}
  >
    <ListFilter size={18} aria-hidden="true" />
    {#if active}<span class="dot" aria-hidden="true"></span>{/if}
  </button>
  {#if open}
    <div class="menu" role="menu" tabindex="-1" {onkeydown}>
      {#each options as option, i (option)}
        <button type="button" role="menuitemradio" aria-checked={value === option} onclick={() => choose(option)} {@attach (el) => { if (i === 0) el.focus(); }}>
          {text(option)}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
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
</style>

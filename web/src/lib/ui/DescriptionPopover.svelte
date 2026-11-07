<script lang="ts">
  // description of a room or corridor as maintained in Mumble: the binders open it as a popover (top layer, so
  // neither the scrolling floor plan nor the room's container clip it). Escape, a click beside it or on a link closes
  // it; links open in a new tab. Markdown from Ruumble's room setup is rendered like a board post, Mumble's rich text
  // as before (renderChannelDescription). A click beside it only closes it: it enters no room.
  import { renderChannelDescription } from "../board/render.ts";
  import { t } from "../i18n/index.svelte.ts";
  import Binders from "./Binders.svelte";
  import { placeNear, swallowClickBeside, toBody } from "./popover.ts";

  let { channelId, name, description, size = 26 }: { channelId: number; name: string; description: string; size?: number } = $props();

  const id = $derived(`description-${channelId}`);
  const html = $derived(renderChannelDescription(description));
  const label = $derived(t().space.showDescription(name));
  let button = $state<HTMLButtonElement | null>(null);
  let popover = $state<HTMLElement | null>(null);
  let open = $state(false);

  // the toggle event comes a moment after the popover is shown: until then it stays invisible, not in the corner
  function onbeforetoggle(e: ToggleEvent): void {
    if (e.newState === "open" && popover) popover.style.visibility = "hidden";
  }

  // closing gives the focus back to the binders; after Escape the browser would show the focus ring there. Only
  // where the popup was opened with the keyboard: opened with the mouse, the binders let go of the focus again
  let openedByPointer = false;

  function ontoggle(e: ToggleEvent): void {
    open = e.newState === "open";
    if (!open && openedByPointer && document.activeElement === button) button?.blur();
    if (!open || !popover || !button) return;
    placeNear(button, popover);
    popover.style.visibility = "";
    popover.focus({ preventScroll: true });
  }

  // a click beside it only closes it
  $effect(() => {
    if (open) return swallowClickBeside(() => [popover, button]);
  });

  function onclick(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest("a")) popover?.hidePopover();
  }
</script>

<button
  bind:this={button}
  type="button"
  class="binders-toggle"
  aria-label={label}
  title={label}
  aria-expanded={open}
  aria-controls={id}
  popovertarget={id}
  onclick={(e) => (openedByPointer = e.detail > 0)}
>
  <Binders {size} />
</button>
<!-- the click only closes it after a link was followed (Enter on a link is a click too) -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<div bind:this={popover} {id} class="description" popover="auto" role="dialog" aria-label={label} tabindex="-1" {@attach toBody} {onbeforetoggle} {ontoggle} {onclick}>
  <div class="body">{@html html}</div>
</div>

<style>
  .binders-toggle {
    border: 0; background: transparent; padding: 4px; margin: -4px; border-radius: var(--radius-md); cursor: pointer;
    min-width: 40px; min-height: 40px; display: flex; align-items: center; justify-content: center;
    transition: transform var(--dur) var(--ease-out);
  }
  .binders-toggle:hover, .binders-toggle[aria-expanded="true"] { transform: translateY(-2px) rotate(-3deg) scale(1.06); }
  .binders-toggle:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 0; }

  /* a third of the window wide, at most 80 % of its height; longer descriptions scroll inside */
  .description {
    position: fixed; inset: auto; margin: 0; box-sizing: border-box;
    width: max(320px, 33vw); max-width: calc(100vw - 32px); max-height: 80vh; overflow: auto;
    padding: 16px 20px; border: 0; border-radius: var(--radius-md); border-top: 4px solid var(--color-blue-500);
    --color-paper: var(--color-raised); background: var(--color-paper); color: var(--color-ink); box-shadow: 0 0 0 1px var(--color-raised-edge), 0 10px 28px rgb(0 56 105 / 0.35);
    font-size: 14px; line-height: 1.5;
  }
  .description:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 0; }
  .body { overflow-wrap: anywhere; }
  .body :global(:first-child) { margin-top: 0; }
  .body :global(:last-child) { margin-bottom: 0; }
  .body :global(p) { margin: 0 0 0.6em; }
  .body :global(a) { color: var(--color-link); }
  .body :global(img) { max-width: 100%; height: auto; }
  .body :global(table) { border-collapse: collapse; }
  .body :global(th), .body :global(td) { padding: 2px 8px; border: 1px solid var(--color-blue-100); text-align: left; }
  .body :global(h1), .body :global(h2), .body :global(h3) { font-size: 16px; margin: 0.8em 0 0.4em; }
  .body :global(ul), .body :global(ol) { margin: 0 0 0.6em; padding-left: 1.3em; }
  .body :global(code) { font-family: var(--font-mono); font-size: 0.92em; padding: 0 3px; border-radius: 3px; background: var(--color-surface); }
  .body :global(pre) { margin: 0 0 0.6em; padding: 6px 8px; border-radius: 4px; background: var(--color-surface); overflow-x: auto; }
  .body :global(pre code) { padding: 0; background: none; }
  .body :global(blockquote) { margin: 0 0 0.6em; padding-left: 10px; border-left: 3px solid var(--color-blue-300); color: var(--color-blue-700); }
</style>

/**
 * Shared parts of the small popups next to a button (room description, listening volume): they live straight under
 * <body>, open next to their button inside the window, and a click beside them only closes them.
 *
 * Under <body>: Qt WebEngine 6.4 (Chromium 102, Ruumble Client) has no top layer for popovers; the polyfill shows them
 * as position: fixed in place, where a transformed or scrolling ancestor would become their containing block.
 */

/**
 * attachment: moves the popup under <body> for as long as it exists. Keep the popup and its button inside an element
 * of their own: Svelte removes a block as the run of nodes from its first to its last, and with the popup moved away
 * that run would go on into the siblings that follow.
 */
export function toBody(node: HTMLElement): () => void {
  document.body.appendChild(node);
  return () => node.remove();
}

/** next to `anchor`, inside the window: towards the middle of the window, below if it fits, else above */
export function placeNear(anchor: Element, popover: HTMLElement, margin = 16, gap = 6): void {
  const a = anchor.getBoundingClientRect();
  const { width, height } = popover.getBoundingClientRect();
  const clamp = (value: number, max: number) => Math.max(margin, Math.min(value, max - margin));
  const left = a.left + a.width / 2 > innerWidth / 2 ? a.right - width : a.left;
  const below = a.bottom + gap;
  const top = below + height <= innerHeight - margin ? below : a.top - gap - height;
  popover.style.left = `${clamp(left, innerWidth - width)}px`;
  popover.style.top = `${clamp(top, innerHeight - height)}px`;
}

/**
 * While a popup is open: light dismiss lets the click through to what lies below, so the click a press beside the
 * popup ends in is swallowed (it only closes the popup, it enters no room and opens no door). Dropped after that press
 * in any case, so a press that ends without a click (dragged away) swallows nothing later. Returns the cleanup.
 */
export function swallowClickBeside(inside: () => (Element | null)[]): () => void {
  const swallow = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  const onpointerdown = (e: PointerEvent) => {
    const target = e.target as Node;
    if (inside().some((el) => el?.contains(target))) return;
    window.addEventListener("click", swallow, { capture: true, once: true });
    window.addEventListener("pointerup", () => setTimeout(() => window.removeEventListener("click", swallow, { capture: true })), { capture: true, once: true });
  };
  window.addEventListener("pointerdown", onpointerdown, { capture: true });
  return () => window.removeEventListener("pointerdown", onpointerdown, { capture: true });
}

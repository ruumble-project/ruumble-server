<script lang="ts">
  // board graphic in the room (ADR-0011): a cork board on the wall with two notes pinned to it (#29: the notes as
  // before, now on cork in a wooden frame, so it is a piece of furniture beside the task board). Only in the user's
  // own room, as the toggle for the sidebar. It does not show how much is pinned there, only `fresh`: posts by others
  // the user has not seen yet add a yellow note in front (it lands and the board wobbles).
  let { fresh = false }: { fresh?: boolean } = $props();
</script>

<svg class="notes" class:fresh width="56" height="38" viewBox="0 0 44 30" aria-hidden="true">
  <rect x="0.5" y="0.5" width="43" height="29" rx="1.6" class="frame" />
  <rect x="3" y="3" width="38" height="24" rx="0.6" class="cork" />
  <circle cx="7" cy="24" r="0.6" class="pore" /><circle cx="21" cy="5" r="0.6" class="pore" /><circle cx="37.5" cy="23.5" r="0.6" class="pore" /><circle cx="19" cy="24.5" r="0.5" class="pore" /><circle cx="38" cy="6" r="0.5" class="pore" />
  <g transform="rotate(-7 14 15)">
    <rect x="7" y="6.5" width="13" height="16" class="paper" />
    <line x1="10" y1="13.5" x2="17" y2="13.5" class="line" /><line x1="10" y1="17" x2="15.5" y2="17" class="line" />
    <circle cx="13.5" cy="8.5" r="2.2" class="pin a" />
  </g>
  <g transform="rotate(6 30 15)">
    <rect x="23" y="7" width="13" height="16" class="paper" />
    <line x1="26" y1="14" x2="33" y2="14" class="line" /><line x1="26" y1="17.5" x2="31.5" y2="17.5" class="line" />
    <circle cx="29.5" cy="9" r="2.2" class="pin b" />
  </g>
  {#if fresh}
    <g class="new">
      <g transform="rotate(-3 22 16)">
        <rect x="15" y="8" width="13" height="15" class="paper new-paper" />
        <line x1="18" y1="14.5" x2="25" y2="14.5" class="line new-line" /><line x1="18" y1="18" x2="23.5" y2="18" class="line new-line" />
        <circle cx="21.5" cy="10" r="2.2" class="pin c" />
      </g>
    </g>
  {/if}
</svg>

<style>
  .notes { display: block; overflow: visible; filter: drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.18)); }
  .frame { fill: var(--color-cork-edge); stroke: var(--color-ink); stroke-width: 0.9; }
  .cork { fill: var(--color-cork); }
  .pore { fill: var(--color-cork-pore); }
  .paper { fill: var(--color-paper); stroke: var(--color-blue-500); stroke-width: 1; }
  .line { stroke: var(--color-blue-500); stroke-width: 1.1; stroke-linecap: round; }
  .pin { stroke: var(--color-ink); stroke-width: 0.6; }
  .pin.a { fill: var(--color-sky); }
  .pin.b { fill: var(--color-accent); }
  .new-paper { fill: var(--color-accent); stroke: var(--color-ink); }
  .new-line { stroke: var(--color-ink); }
  .pin.c { fill: var(--color-ink); }
  /* the new note is pinned on from above, then the stack wobbles once; replayed for every further post */
  .new { transform-box: fill-box; transform-origin: 50% 0; animation: note-land 420ms var(--ease-out) both; }
  .notes.fresh { transform-origin: 50% 0; animation: notes-wobble 700ms 300ms ease-in-out; }
  @keyframes note-land {
    0% { transform: translateY(-9px) scale(1.25) rotate(-8deg); opacity: 0; }
    60% { transform: translateY(1px) scale(0.97) rotate(2deg); opacity: 1; }
    100% { transform: none; }
  }
  @keyframes notes-wobble {
    0%, 100% { transform: none; }
    20% { transform: rotate(-6deg); }
    45% { transform: rotate(5deg); }
    70% { transform: rotate(-2.5deg); }
  }
</style>

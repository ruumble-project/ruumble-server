<script lang="ts">
  // the task board (#29): a whiteboard on a rolling stand with three columns of magnet cards (needs help, being helped,
  // done). Open requests raise a flag: red while one of them is new (2 hours), then green; when one has waited long,
  // the flag waves. The cards on the board show how much there is, no number.
  // Drawn 44 × 40 with the wheels on the bottom edge; the flag reaches 12 above and 8 to the right.
  import type { BoardLook } from "../../taskboard/model.ts";

  let { look = "empty", open = 0, helping = 0, done = false, fresh = false, width = 44 }: { look?: BoardLook; open?: number; helping?: number; done?: boolean; fresh?: boolean; width?: number } = $props();
  const scale = $derived(width / 44);
  const flag = $derived(look === "open" || look === "waiting");
  /** at most two cards per column */
  const openCards = $derived(Math.min(2, open));
  const helpCards = $derived(Math.min(2, helping));
</script>

<svg class="taskboard" class:waving={look === "waiting"} width={52 * scale} height={52 * scale} viewBox="0 -12 52 52" aria-hidden="true">
  <!-- stand: two legs on wheels, a middle post and a brace -->
  <line x1="10" y1="25" x2="6" y2="37.5" class="leg" /><line x1="34" y1="25" x2="38" y2="37.5" class="leg" />
  <line x1="22" y1="25" x2="22" y2="33" class="leg" /><line x1="8" y1="33" x2="36" y2="33" class="leg thin" />
  <circle cx="6" cy="38.2" r="1.8" class="wheel" /><circle cx="38" cy="38.2" r="1.8" class="wheel" />
  <!-- the board with three columns -->
  <rect x="2" y="4" width="40" height="22" rx="1.5" class="surface" />
  <line x1="15.3" y1="7" x2="15.3" y2="23" class="divider" /><line x1="28.7" y1="7" x2="28.7" y2="23" class="divider" />
  {#each { length: openCards } as _, i (i)}<rect x="5" y={8 + i * 7.5} width="8" height="5.5" rx="0.7" class="card open" />{/each}
  {#each { length: helpCards } as _, i (i)}<rect x="18" y={8 + i * 7.5} width="8" height="5.5" rx="0.7" class="card help" />{/each}
  {#if done}<rect x="31" y="8" width="8" height="5.5" rx="0.7" class="card done" />{/if}
  {#if flag}
    <g class="flag-group">
      <line x1="39" y1="4.5" x2="39" y2="-11" class="pole" />
      <path d="M39 -11 L50 -6.5 L39 -2 Z" class="flag" class:fresh />
    </g>
  {/if}
</svg>

<style>
  .taskboard { display: block; overflow: visible; filter: drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.18)); }
  .surface { fill: var(--color-paper); stroke: var(--color-ink); stroke-width: 0.9; }
  .leg { stroke: var(--color-ink); stroke-width: 1.2; stroke-linecap: round; }
  .leg.thin { stroke-width: 0.8; }
  .wheel { fill: var(--color-ink); }
  .divider { stroke: var(--color-blue-300); stroke-width: 0.7; }
  .card.open { fill: var(--color-signal); }
  .card.help { fill: var(--color-sky); }
  .card.done { fill: var(--color-leaf); }
  .pole { stroke: var(--color-ink); stroke-width: 1; stroke-linecap: round; }
  .flag { fill: var(--color-flag-old); stroke: var(--color-ink); stroke-width: 0.5; stroke-linejoin: round; transform-origin: 39px -6.5px; transform-box: view-box; }
  .flag.fresh { fill: var(--color-flag-new); }
  /* waiting long: the flag waves gently */
  .waving .flag { animation: wave 1.8s ease-in-out infinite; }
  @keyframes wave {
    0%, 100% { transform: skewY(0deg) scaleX(1); }
    25% { transform: skewY(-8deg) scaleX(0.92); }
    75% { transform: skewY(6deg) scaleX(1.04); }
  }
  @media (prefers-reduced-motion: reduce) { .waving .flag { animation: none; } }
</style>

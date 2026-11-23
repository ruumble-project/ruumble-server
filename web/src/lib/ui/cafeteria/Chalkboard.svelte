<script lang="ts">
  // the cafeteria's chalkboard sign (#30): the folding A-board cafés put on the pavement, "Café", a cup and in chalk
  // how many are inside (none: no number). `back`: inside the cafeteria, an arrow back instead of cup and number
  let { count = 0, width = 44, back = false }: { count?: number; width?: number; back?: boolean } = $props();
</script>

<svg class="chalkboard" width={width} height={(width * 56) / 44} viewBox="0 0 44 56" aria-hidden="true">
  <ellipse cx="22" cy="54" rx="17" ry="2.4" class="shadow" />
  <line x1="10" y1="4" x2="3" y2="53.5" class="leg" /><line x1="34" y1="4" x2="41" y2="53.5" class="leg" />
  <polygon points="9,1 35,1 40,46 4,46" class="slate" />
  <text x="22" y="13" text-anchor="middle" class="chalk small">Café</text>
  {#if back}
    <path d="M29 22 h-10 a6 6 0 0 0 0 12 h6 M19 22 l4 -4 M19 22 l4 4" class="line arrow" />
  {:else}
    <path d="M15 19 h12 v7 a6 6 0 0 1 -12 0 z M27 21 h3 a2.5 2.5 0 0 1 0 5 h-3" class="line" />
    <path d="M18 17 c-1 -2 1 -3 0 -5 M23 17 c-1 -2 1 -3 0 -5" class="line thin" />
    {#if count > 0}<text x="22" y="43" text-anchor="middle" class="chalk big">{count > 99 ? "99+" : count}</text>{/if}
  {/if}
</svg>

<style>
  .chalkboard { display: block; overflow: visible; }
  .shadow { fill: rgb(0 0 0 / 0.18); }
  .leg { stroke: var(--color-chalk-frame); stroke-width: 2.5; stroke-linecap: round; }
  .slate { fill: var(--color-chalk); stroke: var(--color-chalk-frame); stroke-width: 2.5; stroke-linejoin: round; }
  .chalk { fill: #f4f1e8; font-weight: 700; font-family: "Comic Sans MS", "Segoe Print", var(--font-sans); }
  .chalk.small { font-size: 9px; }
  .chalk.big { font-size: 15px; }
  .line { fill: none; stroke: #f4f1e8; stroke-width: 1.2; stroke-linecap: round; }
  .line.thin { stroke-width: 0.9; }
  .line.arrow { stroke-width: 1.8; stroke-linejoin: round; }
</style>

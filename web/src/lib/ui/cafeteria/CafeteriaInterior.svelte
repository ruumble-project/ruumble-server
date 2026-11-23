<script lang="ts">
  // the cafeteria (#30), drawn from above in CAFE_VIEW coordinates (model/cafeteria.ts): a wooden floor; the walls to
  // the lobby (west, and south with the door to the lobby); the door to the outside in the north and the window in the
  // east, glowing while someone is inside; the counter with the espresso machine and three stools along the west wall,
  // the round table with five chairs below it, two sofas over the corner at the top right (four and five cushions,
  // one person each) with a rug and a square low table.
  import { door } from "./door.svelte.ts";

  let { lit = false }: { lit?: boolean } = $props();
  const chairs = [0, 72, 144, 216, 288];
  const corners = [{ x: 667, y: 134 }, { x: 777, y: 134 }, { x: 667, y: 236 }, { x: 777, y: 236 }];
</script>

<svg class="interior" class:lit viewBox="442 76 396 256" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <!-- parquet: long boards, the joints offset by a third from board to board, repeating after three rows -->
    <pattern id="cafe-wood" width="72" height="27" patternUnits="userSpaceOnUse">
      <rect width="72" height="27" class="wood" />
      <rect y="9" width="72" height="9" class="wood-shade" />
      <line x1="0" y1="8.75" x2="72" y2="8.75" class="wood-line" /><line x1="0" y1="17.75" x2="72" y2="17.75" class="wood-line" /><line x1="0" y1="26.75" x2="72" y2="26.75" class="wood-line" />
      <line x1="0.5" y1="0" x2="0.5" y2="9" class="wood-line" /><line x1="24.5" y1="9" x2="24.5" y2="18" class="wood-line" /><line x1="48.5" y1="18" x2="48.5" y2="27" class="wood-line" />
    </pattern>
    <radialGradient id="cafe-warm" cx="70%" cy="35%" r="85%">
      <stop offset="0" class="warm" stop-opacity="0.95" /><stop offset="0.7" class="warm" stop-opacity="0.35" /><stop offset="1" class="warm" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect x="444" y="76" width="394" height="254" fill="url(#cafe-wood)" />
  <rect x="444" y="76" width="394" height="254" fill="url(#cafe-warm)" class="glow" />
  <!-- walls to the lobby: west, and south with the door to the lobby -->
  <!-- walls as thick as the building's (non-scaling): the door's leaf and swing meet them exactly -->
  <line x1="444" y1="76" x2="444" y2="330" class="wall" vector-effect="non-scaling-stroke" />
  <line x1="444" y1="330" x2="600" y2="330" class="wall" vector-effect="non-scaling-stroke" /><line x1="640" y1="330" x2="838" y2="330" class="wall" vector-effect="non-scaling-stroke" />
  <path d="M600 330 v-40 a40 40 0 0 1 40 40" class="arc" /><line x1="600" y1="330" x2="600" y2="290" class="leaf" />
  <!-- the door to the outside: hinged at the north wall (its opening in the wall itself: CafeteriaLight) -->
  <path d="M{door.x} 76 v40 a40 40 0 0 0 40 -40" class="arc" /><line x1={door.x} y1="76" x2={door.x} y2="116" class="leaf" />
  <!-- the counter along the west wall with the espresso machine and a cup, three stools -->
  <rect x="450" y="88" width="34" height="132" rx="3" class="counter" /><rect x="450" y="88" width="9" height="132" rx="3" class="counter-top" />
  <rect x="452" y="96" width="30" height="27" rx="4" class="machine" />
  <rect x="456" y="99.5" width="12" height="6" rx="1.2" class="display" /><circle cx="475" cy="102.5" r="2.6" class="knob" />
  <rect x="460" y="108" width="14" height="3.5" rx="1" class="steel" /><rect x="464.5" y="111" width="5" height="3" class="steel" />
  <path d="M461.5 115 h11 v4 a3 3 0 0 1 -3 3 h-5 a3 3 0 0 1 -3 -3 z" class="cup" />
  <path d="M462 150 h10 v6 a5 5 0 0 1 -10 0 z M472 152 h2.5 a2.2 2.2 0 0 1 0 4.4 h-2.5" class="cup" />
  <path d="M465 147 c-1.5 -2.5 1.5 -4 0 -6.5 M469 147 c-1.5 -2.5 1.5 -4 0 -6.5" class="steam" />
  <circle cx="500" cy="120" r="7" class="seat" /><circle cx="500" cy="154" r="7" class="seat" /><circle cx="500" cy="188" r="7" class="seat" />
  <!-- the round table below the counter with five chairs, their backs to the outside -->
  <circle cx="500" cy="276" r="21" class="table" />
  {#each chairs as angle (angle)}
    <g transform="rotate({angle} 500 276)"><rect x="493" y="240" width="14" height="11" rx="2.5" class="seat" /><rect x="491.5" y="235.5" width="17" height="5" rx="2" class="chair-back" /></g>
  {/each}
  <!-- the sofas over the corner, a rug and a square low table -->
  <!-- the rug: a border, a field with a framed line and corner diamonds, fringes on its short sides -->
  <g class="rug">
    {#each [124, 130, 136, 142, 148, 154, 160, 166, 172, 178, 184, 190, 196, 202, 208, 214, 220, 226, 232, 238, 244] as y (y)}
      <line x1="648" y1={y} x2="654" y2={y} class="fringe" /><line x1="790" y1={y} x2="796" y2={y} class="fringe" />
    {/each}
    <rect x="653" y="120" width="138" height="130" rx="3" class="rug-edge" />
    <rect x="660" y="127" width="124" height="116" rx="2" class="rug-field" />
    <rect x="667" y="134" width="110" height="102" rx="1.5" class="rug-line" />
    {#each corners as c (`${c.x},${c.y}`)}
      <path d="M{c.x} {c.y - 4} l4 4 l-4 4 l-4 -4 z" class="rug-diamond" />
    {/each}
  </g>
  <rect x="690" y="150" width="64" height="64" rx="5" class="table" />
  <rect x="640" y="82" width="150" height="12" rx="5" class="sofa-back" /><rect x="640" y="82" width="13" height="36" rx="5" class="sofa-back" />
  {#each [654, 688, 722, 756] as x (x)}<rect {x} y="93" width="33" height="24" rx="4" class="sofa" />{/each}
  <rect x="820" y="82" width="12" height="192" rx="5" class="sofa-back" /><rect x="790" y="82" width="42" height="12" rx="5" class="sofa-back" />
  <rect x="796" y="262" width="36" height="12" rx="5" class="sofa-back" />
  {#each [95, 128, 161, 194, 227] as y (y)}<rect x="796" {y} width="24" height={y === 227 ? 33 : 32} rx="4" class="sofa" />{/each}
</svg>

<style>
  .interior { display: block; width: 100%; height: 100%; }
  .wood { fill: var(--color-wood); }
  .wood-line { stroke: var(--color-wood-line); stroke-width: 1; }
  .warm { stop-color: var(--color-lamp-soft); }
  .glow { opacity: 0; transition: opacity 900ms ease; }
  .lit .glow { opacity: 1; }
  .wall { stroke: var(--color-wall); stroke-width: var(--wall); stroke-linecap: square; }
  .arc { fill: none; stroke: var(--color-blue-300); stroke-width: 1.5; }
  .leaf { stroke: var(--color-ink); stroke-width: 2.5; }
  .counter { fill: var(--color-chalk-frame); stroke: var(--color-ink); stroke-width: 1.2; }
  .counter-top { fill: var(--color-wood); stroke: var(--color-ink); stroke-width: 1; }
  .machine { fill: var(--color-navy); }
  .display { fill: var(--color-sky); }
  .knob { fill: var(--color-white); }
  .steel { fill: #9aa7b4; }
  .cup { fill: var(--color-white); stroke: var(--color-navy); stroke-width: 0.9; }
  .steam { fill: none; stroke: var(--color-blue-700); stroke-width: 1.4; stroke-linecap: round; opacity: 0.7; }
  .seat { fill: var(--color-paper); stroke: var(--color-ink); stroke-width: 1; }
  .chair-back { fill: var(--color-chalk-frame); stroke: var(--color-ink); stroke-width: 1; }
  .wood-shade { fill: var(--color-wood-line); opacity: 0.25; }
  .rug-edge { fill: var(--color-rug-edge); }
  .rug-field { fill: var(--color-rug); }
  .rug-line { fill: none; stroke: var(--color-rug-edge); stroke-width: 1.5; }
  .rug-diamond { fill: var(--color-rug-edge); }
  .fringe { stroke: var(--color-rug-edge); stroke-width: 1.2; stroke-linecap: round; }
  .table { fill: var(--color-wood-line); stroke: var(--color-ink); stroke-width: 1.2; }
  .sofa { fill: var(--color-sofa); stroke: var(--color-ink); stroke-width: 1; }
  .sofa-back { fill: var(--color-sofa-back); stroke: var(--color-ink); stroke-width: 1; }
  @media (prefers-reduced-motion: reduce) { .glow { transition: none; } }
</style>

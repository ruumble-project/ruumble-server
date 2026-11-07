<script lang="ts">
  // the paint bucket in a room, next to the plant: room setup (Ruumble Client, Mumble Write), only for whoever may
  // set the room up. Drawn on the plant's grid (viewBox 30 x 36, floor at y = 34), so both stand on the same floor.
  let { size = 26 }: { size?: number } = $props();
</script>

<svg class="bucket" width={size} height={Math.round(size * 1.2)} viewBox="0 0 30 36" aria-hidden="true">
  <path d="M6 19 V33 Q6 34 7 34 H21 Q22 34 22 33 V19 Z" class="tin" />
  <path d="M6 23.5 A8 2.2 0 0 0 22 23.5" class="band" />
  <rect x="8" y="23" width="1.4" height="9" rx="0.7" class="shine" />
  <ellipse cx="14" cy="19" rx="8" ry="2.2" class="tin" />
  <ellipse cx="14" cy="19.1" rx="6.6" ry="1.5" class="paint" />
  <ellipse cx="15" cy="19.4" rx="2.4" ry="0.6" class="paint deep" />
  <!-- the brush stands in the paint: handle, ferrule, wet bristles at the surface -->
  <g transform="rotate(16 15 19.4)">
    <path d="M13.7 14.2 L14 8.2 Q15 5.8 16 8.2 L16.3 14.2 Z" class="handle" />
    <rect x="12.4" y="14" width="5.2" height="4.4" rx="0.6" class="ferrule" />
    <path d="M12.4 15.5 H17.6" class="crimp" />
    <path d="M12.6 18.4 H17.4 V19.4 H12.6 Z" class="paint deep" />
  </g>
  <!-- the front rim in front of the brush, paint running over it -->
  <path d="M6 19 A8 2.2 0 0 0 22 19" class="rim" />
  <path d="M8.3 20.4 C8.3 22.5 8.1 24.6 9.1 24.9 C10.1 24.9 10.1 22.6 10.1 20.9 Z" class="drip" />
  <path d="M17.2 21 C17.2 22 17.1 22.9 17.8 23.1 C18.5 23.1 18.5 22 18.5 20.8 Z" class="drip" />
</svg>

<style>
  .bucket { display: block; overflow: visible; filter: drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.18)); transition: opacity var(--dur) var(--ease-out), filter var(--dur) var(--ease-out); }
  .tin { fill: var(--color-steel); stroke: var(--color-ink); stroke-width: 1; stroke-linejoin: round; }
  .band { fill: none; stroke: var(--color-ink); stroke-width: 0.6; opacity: 0.3; }
  .shine { fill: #fff; opacity: 0.6; }
  .paint { fill: var(--color-blue-500); }
  .paint.deep { fill: var(--color-blue-700); }
  .handle { fill: var(--color-pot); stroke: var(--color-ink); stroke-width: 0.9; stroke-linejoin: round; }
  .ferrule { fill: #e3eaf1; stroke: var(--color-ink); stroke-width: 0.9; }
  .crimp { stroke: var(--color-ink); stroke-width: 0.6; opacity: 0.5; }
  .rim { fill: none; stroke: var(--color-ink); stroke-width: 1; }
  .drip { fill: var(--color-blue-500); stroke: var(--color-blue-700); stroke-width: 0.5; }
</style>

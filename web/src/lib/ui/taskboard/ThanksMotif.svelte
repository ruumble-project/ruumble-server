<script lang="ts">
  // the drawn motifs of a thank-you card (#29): drawn like the plant and the key, not emoji, so they look the same in
  // Ruumble Client and every browser
  import type { ThanksMotif } from "@ruumble/protocol";

  let { motif, size = 32 }: { motif: ThanksMotif; size?: number } = $props();
</script>

<svg class="motif" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
  {#if motif === "coffee"}
    <path d="M6 12h16v8a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z" class="cup" />
    <path d="M22 14h2.5a3 3 0 0 1 0 6H22" class="handle" />
    <path d="M11 4c-1 2 1 3 0 5M15 4c-1 2 1 3 0 5" class="steam" />
  {:else if motif === "cake"}
    <path d="M4 24L26 14v10z" class="cake" />
    <path d="M4 24L26 14" class="cream" />
    <circle cx="22" cy="11" r="2.3" class="cherry" />
  {:else if motif === "rocket"}
    <path d="M16 3c5 4 6 10 4 17h-8c-2-7-1-13 4-17z" class="hull" />
    <circle cx="16" cy="12" r="2.4" class="window" />
    <path d="M12 20l-4 5 5-1M20 20l4 5-5-1" class="fins" />
    <path d="M14 22l2 6 2-6" class="fire" />
  {:else if motif === "trophy"}
    <path d="M10 5h12v6a6 6 0 0 1-12 0z" class="gold" />
    <path d="M10 7H6a4 4 0 0 0 4 6M22 7h4a4 4 0 0 1-4 6" class="ears" />
    <path d="M14 17h4v4h-4zM10 21h12v4H10z" class="gold" />
  {:else if motif === "flowers"}
    <path d="M16 17v11" class="stem" />
    <path d="M16 24c-3-1-5-3-5-6 3 0 5 2 5 6z" class="leaf" />
    <g class="petals"><circle cx="16" cy="6.5" r="3.5" /><circle cx="21" cy="11" r="3.5" /><circle cx="16" cy="15.5" r="3.5" /><circle cx="11" cy="11" r="3.5" /></g>
    <circle cx="16" cy="11" r="2.6" class="centre" />
  {:else if motif === "high-five"}
    <path d="M9 28v-8l-3-5a1.6 1.6 0 0 1 2.7-1.6L11 16V6a1.5 1.5 0 0 1 3 0v8-10a1.5 1.5 0 0 1 3 0v10-8a1.5 1.5 0 0 1 3 0v9-6a1.5 1.5 0 0 1 3 0v10c0 4-2 7-5 9z" class="hand" />
    <path d="M25 3l1.5 3M28 8l-3 1M4 8l3 1" class="spark" />
  {:else if motif === "lifebuoy"}
    <circle cx="16" cy="16" r="11" class="ring" />
    <circle cx="16" cy="16" r="5" class="hole" />
    <path d="M16 5v6M16 21v6M5 16h6M21 16h6" class="bands" />
  {:else}
    <path d="M16 3l3.8 8 8.7 1-6.4 6 1.7 8.6L16 22.3 8.2 26.6 9.9 18 3.5 12l8.7-1z" class="star" />
  {/if}
</svg>

<style>
  .motif { display: block; flex: none; }
  /* fixed colours: the motifs are little pictures on their own tinted tile, in both themes */
  .cup { fill: #fff; stroke: #7a5236; stroke-width: 1.6; }
  .handle { fill: none; stroke: #7a5236; stroke-width: 1.6; }
  .steam { fill: none; stroke: #c97d4e; stroke-width: 1.4; stroke-linecap: round; }
  .cake { fill: #fff6c2; stroke: #b0476b; stroke-width: 1.5; stroke-linejoin: round; }
  .cream { stroke: #b0476b; stroke-width: 3; }
  .cherry { fill: #c62828; }
  .hull { fill: #fff; stroke: #0078be; stroke-width: 1.6; }
  .window { fill: #5aa6e7; }
  .fins { fill: #5aa6e7; stroke: #0078be; stroke-width: 1.2; stroke-linejoin: round; }
  .fire { fill: #e8741c; }
  .gold { fill: #d9a93b; stroke: #7a5236; stroke-width: 1.4; }
  .ears { fill: none; stroke: #7a5236; stroke-width: 1.4; }
  .stem { stroke: #2f6e47; stroke-width: 1.8; }
  .leaf { fill: #4f9a6b; }
  .petals { fill: #f7c6d4; stroke: #b0476b; stroke-width: 1; }
  .centre { fill: #fbd200; }
  .hand { fill: #fff; stroke: #7a5fb0; stroke-width: 1.4; stroke-linejoin: round; }
  .spark { stroke: #7a5fb0; stroke-width: 1.4; stroke-linecap: round; }
  .ring { fill: #fff; stroke: #c62828; stroke-width: 1.4; }
  .hole { fill: #fdeedf; stroke: #c62828; stroke-width: 1.4; }
  .bands { stroke: #c62828; stroke-width: 4; }
  .star { fill: #fbd200; stroke: #b8520a; stroke-width: 1.3; stroke-linejoin: round; }
</style>

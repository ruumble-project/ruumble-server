<script lang="ts">
  // the lobby's reception desk (#31), from above: a wide counter curved towards the visitors, an office chair behind it
  // facing it, a bell on it that opens Ruumble's website. In front of it, to the left and right, two chalkboard
  // signs like the cafeteria's: BUG (muted dark orange) opens the bug report form, IDEA (moss green) the feature
  // request form.
  import { LOBBY_LINKS } from "../../model/lobby.ts";
  import { t } from "../../i18n/index.svelte.ts";

  const signs = [
    { text: "BUG", x: 36, slate: "#9c5a2e", href: LOBBY_LINKS.bug, label: () => t().lobby.bug },
    { text: "IDEA", x: 184, slate: "#5f6f3f", href: LOBBY_LINKS.idea, label: () => t().lobby.idea },
  ];
</script>

<svg class="desk" width="250" height="166" viewBox="0 0 220 146">
  <!-- the counter, open towards the chair -->
  <path d="M14 12 Q14 76 110 76 Q206 76 206 12 L174 12 Q174 46 110 46 Q46 46 46 12 Z" class="counter" />
  <path d="M21 12 Q21 69 110 69 Q199 69 199 12" class="edge" />
  <!-- the office chair: backrest, seat, armrests -->
  <rect x="93" y="4" width="34" height="8" rx="4" class="chair-back" />
  <rect x="97" y="11" width="26" height="24" rx="6" class="chair-seat" />
  <rect x="92" y="13" width="5" height="17" rx="2.5" class="chair-back" /><rect x="123" y="13" width="5" height="17" rx="2.5" class="chair-back" />
  <!-- the bell -->
  <a href={LOBBY_LINKS.website} target="_blank" rel="noopener noreferrer" aria-label={t().lobby.bell}>
    <title>{t().lobby.bell}</title>
    <circle cx="150" cy="56" r="12" class="hit" />
    <circle cx="150" cy="56" r="6" class="bell" /><circle cx="150" cy="56" r="1.6" class="bell-top" />
  </a>
  <!-- the two signs in front of the desk -->
  {#each signs as s (s.text)}
    <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label()} class="sign">
      <title>{s.label()}</title>
      <g transform="translate({s.x - 22} 88)">
        <ellipse cx="22" cy="54" rx="17" ry="2.4" class="shadow" />
        <line x1="10" y1="4" x2="3" y2="53.5" class="leg" /><line x1="34" y1="4" x2="41" y2="53.5" class="leg" />
        <polygon points="9,1 35,1 40,46 4,46" class="slate" style:fill={s.slate} />
        <text x="22" y="29" text-anchor="middle" class="chalk" style:font-size="{s.text.length > 3 ? 11 : 13}px">{s.text}</text>
        <path d="M12 36 q10 3 20 0" class="line" />
      </g>
    </a>
  {/each}
</svg>

<style>
  .desk { display: block; overflow: visible; }
  .counter { fill: var(--color-wood-line); stroke: var(--color-ink); stroke-width: 1.5; }
  .edge { fill: none; stroke: var(--color-wood); stroke-width: 2; opacity: 0.8; }
  .chair-back { fill: var(--color-sofa-back); stroke: var(--color-ink); stroke-width: 1.2; }
  .chair-seat { fill: var(--color-sofa); stroke: var(--color-ink); stroke-width: 1.2; }
  .hit { fill: transparent; }
  .bell { fill: #d9a93b; stroke: #7a5236; stroke-width: 1; }
  .bell-top { fill: #7a5236; }
  a { cursor: pointer; outline: none; }
  a:hover .bell, a:focus-visible .bell { fill: #f0c24e; }
  a:focus-visible .hit { stroke: var(--color-sky); stroke-width: 3; }
  .sign g { transition: transform var(--dur) var(--ease-out); }
  .sign:hover .slate, .sign:focus-visible .slate { filter: brightness(1.15); }
  .sign:focus-visible .slate { stroke: var(--color-sky); stroke-width: 3; }
  .shadow { fill: rgb(0 0 0 / 0.18); }
  .leg { stroke: var(--color-chalk-frame); stroke-width: 2.5; stroke-linecap: round; }
  .slate { stroke: var(--color-chalk-frame); stroke-width: 2.5; stroke-linejoin: round; }
  .chalk { fill: #f4f1e8; font-weight: 700; font-family: "Comic Sans MS", "Segoe Print", var(--font-sans); }
  .line { fill: none; stroke: #f4f1e8; stroke-width: 1.2; stroke-linecap: round; }
</style>

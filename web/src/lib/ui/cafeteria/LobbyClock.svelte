<script lang="ts">
  // the lobby's wall clock (#31): the time of the own computer, and below it a plate with the weekday and the date in
  // the UI's language. With reduced motion there is no seconds hand.
  import { intlLocale, t } from "../../i18n/index.svelte.ts";

  let now = $state(new Date());
  const calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  $effect(() => {
    const timer = setInterval(() => (now = new Date()), calm ? 30_000 : 1000);
    return () => clearInterval(timer);
  });
  const hour = $derived(((now.getHours() % 12) + now.getMinutes() / 60) * 30);
  const minute = $derived(now.getMinutes() * 6);
  const second = $derived(now.getSeconds() * 6);
  const date = $derived(now.toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" }));
  const time = $derived(now.toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" }));
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
</script>

<div class="clock" role="img" aria-label={t().lobby.clock(time, date)}>
  <svg width="84" height="84" viewBox="-42 -42 84 84" aria-hidden="true">
    <circle r="39" class="face" />
    {#each ticks as a (a)}<line y1="-31" y2={a % 90 === 0 ? -26 : -28} transform="rotate({a})" class="tick" />{/each}
    <line y1="4" y2="-18" transform="rotate({hour})" class="hand hour" />
    <line y1="5" y2="-28" transform="rotate({minute})" class="hand minute" />
    {#if !calm}<line y1="6" y2="-31" transform="rotate({second})" class="second" />{/if}
    <circle r="2.5" class="pin" />
  </svg>
  <span class="date">{date}</span>
</div>

<style>
  .clock { display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
  .face { fill: var(--color-white); stroke: var(--color-navy); stroke-width: 3; }
  .tick { stroke: var(--color-navy); stroke-width: 2; stroke-linecap: round; }
  .hand { stroke: var(--color-navy); stroke-linecap: round; }
  .hour { stroke-width: 4; }
  .minute { stroke-width: 2.5; }
  .second { stroke: #d6332a; stroke-width: 1.2; stroke-linecap: round; }
  .pin { fill: var(--color-navy); }
  .date {
    padding: 4px 14px; border-radius: var(--radius-md); background: var(--color-navy); color: var(--color-white);
    font-size: 12px; font-weight: 700; white-space: nowrap;
  }
</style>

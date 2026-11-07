<script lang="ts">
  // the volume of a room the own user listens to (#19): a slider from quieter to louder, in whole dB
  import Volume from "@lucide/svelte/icons/volume";
  import Volume2 from "@lucide/svelte/icons/volume-2";
  import { LISTEN_VOLUME } from "../../model/listening.ts";
  import { t } from "../../i18n/index.svelte.ts";

  let { room, volume, onvolume, dark = false }: { room: string; volume: number; onvolume: (db: number) => void; dark?: boolean } = $props();
</script>

<span class="volume" class:dark>
  <Volume size={16} aria-hidden="true" />
  <input
    type="range" min={LISTEN_VOLUME.min} max={LISTEN_VOLUME.max} step={LISTEN_VOLUME.step} value={volume}
    aria-label={t().listen.volumeOf(room)} aria-valuetext={t().listen.volumeValue(volume)} title={t().listen.volumeValue(volume)}
    oninput={(e) => onvolume(Number((e.currentTarget as HTMLInputElement).value))}
  />
  <Volume2 size={16} aria-hidden="true" />
</span>

<style>
  .volume { display: flex; align-items: center; gap: 8px; color: var(--color-blue-700); min-width: 0; }
  .volume.dark { color: var(--color-plate-muted, currentColor); }
  input { flex: 1; min-width: 80px; margin: 0; height: 24px; accent-color: var(--color-blue-500); cursor: pointer; }
  input:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 2px; border-radius: 4px; }
</style>

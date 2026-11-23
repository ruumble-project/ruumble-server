<script lang="ts">
  // the thank-you card (#29): the asker picks a motif and writes a sentence of their own, or lets the dice suggest one.
  // "Cancel" skips it. The card goes to the plaque on the room, the done request and the helper's Mumble log.
  import { TASK_LIMITS, type TaskRequest, type ThanksMotif as Motif } from "@ruumble/protocol";
  import Dices from "@lucide/svelte/icons/dices";
  import { t } from "../../i18n/index.svelte.ts";
  import type { RuumbleState } from "../../state.svelte.ts";
  import { MOTIFS, suggestThanks } from "../../taskboard/model.ts";
  import CareShell from "../care/CareShell.svelte";
  import ThanksMotif from "./ThanksMotif.svelte";

  let { app, request }: { app: RuumbleState; request: TaskRequest } = $props();

  const th = $derived(t().taskboard.thanks);
  let motif = $state<Motif>("coffee");
  let text = $state("");
  let busy = $state(false);

  function dice(): void {
    text = suggestThanks(motif, text);
  }

  async function submit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    if (busy) return;
    busy = true;
    await app.taskboard.thank(request, motif, text.trim());
    busy = false;
  }
</script>

<CareShell title={th.title(request.helper?.name ?? "")} level="thanks" narrow onclose={() => (app.taskboard.thanking = null)} houseRule={request.text}>
  {#snippet glyph()}<span class="glyph"><ThanksMotif {motif} size={34} /></span>{/snippet}
  {#snippet actions()}
    <button type="submit" form="thanks-form" class="btn primary" disabled={busy}>{th.send}</button>
  {/snippet}
  <form id="thanks-form" onsubmit={submit}>
    <fieldset>
      <legend>{th.motif}</legend>
      <div class="motifs">
        {#each MOTIFS as m (m)}
          <label class="motif motif-{m}" class:on={motif === m} title={th.motifs[m]}>
            <input type="radio" name="motif" value={m} bind:group={motif} aria-label={th.motifs[m]} />
            <ThanksMotif motif={m} size={30} />
          </label>
        {/each}
      </div>
    </fieldset>
    <div class="field">
      <label for="thanks-text">{th.text}</label>
      <input id="thanks-text" type="text" bind:value={text} maxlength={TASK_LIMITS.thanksChars} placeholder={th.placeholder} autocomplete="off" />
      <button type="button" class="dice" onclick={dice}><Dices size={16} aria-hidden="true" />{th.dice}</button>
    </div>
  </form>
</CareShell>

<style>
  .glyph { display: inline-flex; }
  form { display: flex; flex-direction: column; gap: 14px; }
  fieldset { margin: 0; padding: 0; border: 0; }
  legend, label[for] { margin-bottom: 6px; font-size: 13px; font-weight: 700; }
  .motifs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .motif { position: relative; aspect-ratio: 1; display: grid; place-items: center; border: 1.5px solid var(--line); border-radius: 10px; cursor: pointer; }
  .motif.on { border-color: var(--ink); box-shadow: 0 0 0 3px var(--color-accent); }
  .motif:focus-within { outline: 3px solid var(--color-sky); outline-offset: 2px; }
  .motif input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .motif-coffee { background: #f3e6d8; } .motif-cake { background: #fbe3ea; } .motif-rocket { background: #e3effa; } .motif-trophy { background: #fbf1c9; }
  .motif-flowers { background: #e6f2ea; } .motif-high-five { background: #ece6f6; } .motif-lifebuoy { background: #fdeedf; } .motif-star { background: #fff6c2; }
  .field { display: flex; flex-direction: column; gap: 4px; }
  input[type="text"] { height: 40px; padding: 0 10px; border: 1px solid var(--control); border-radius: 4px; font: inherit; color: var(--ink); background: var(--paper); }
  .dice { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; padding: 4px 8px; border: 0; border-radius: 4px; background: transparent; color: var(--link); font: inherit; font-size: 13px; cursor: pointer; }
  .dice:hover { background: var(--tint); }
  .dice:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 2px; }
</style>

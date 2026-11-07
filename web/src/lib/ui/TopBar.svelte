<script lang="ts">
  import ArrowDownUp from "@lucide/svelte/icons/arrow-down-up";
  import Bell from "@lucide/svelte/icons/bell";
  import BellOff from "@lucide/svelte/icons/bell-off";
  import Building2 from "@lucide/svelte/icons/building-2";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import HeadphoneOff from "@lucide/svelte/icons/headphone-off";
  import Headphones from "@lucide/svelte/icons/headphones";
  import Keyboard from "@lucide/svelte/icons/keyboard";
  import Languages from "@lucide/svelte/icons/languages";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import Mic from "@lucide/svelte/icons/mic";
  import MicOff from "@lucide/svelte/icons/mic-off";
  import Lightbulb from "@lucide/svelte/icons/lightbulb";
  import LightbulbOff from "@lucide/svelte/icons/lightbulb-off";
  import Package from "@lucide/svelte/icons/package";
  import Tag from "@lucide/svelte/icons/tag";
  import UserIcon from "@lucide/svelte/icons/user";
  import Users from "@lucide/svelte/icons/users";
  import AudioLines from "@lucide/svelte/icons/audio-lines";
  import LogOut from "@lucide/svelte/icons/log-out";
  import MapIcon from "@lucide/svelte/icons/map";
  import Menu from "@lucide/svelte/icons/menu";
  import Settings from "@lucide/svelte/icons/settings";
  import Inbox from "@lucide/svelte/icons/inbox";
  import Ear from "@lucide/svelte/icons/ear";
  import EarOff from "@lucide/svelte/icons/ear-off";
  import ListenVolume from "./listen/ListenVolume.svelte";
  import { listenedRooms } from "../model/listening.ts";
  import { locale, setLocale, t } from "../i18n/index.svelte.ts";
  import { countText, initials, ownPlace, type Building, type Floor } from "../model/building.ts";
  import type { RuumbleState } from "../state.svelte.ts";
  import { SHORTCUT_KEYS } from "../shortcuts.ts";
  import { setTheme, theme } from "../theme.svelte.ts";
  import { statusText } from "../status.ts";
  import Avatar from "./Avatar.svelte";
  import { contextMenu, getDeskAdmin } from "../desk/admin.ts";
  import Key from "./Key.svelte";
  import Plant from "./Plant.svelte";
  import BoardNotes from "./board/BoardNotes.svelte";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import CircleArrowDown from "@lucide/svelte/icons/circle-arrow-down";
  import CircleDot from "@lucide/svelte/icons/circle-dot";
  import Lock from "@lucide/svelte/icons/lock";
  import Monitor from "@lucide/svelte/icons/monitor";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { keyText } from "../desk/transmit.ts";
  import TransmitMenu from "./desk/TransmitMenu.svelte";

  // Top bar instead of the elevator column, made of signs: left the floor sign (opens the elevator, which shows
  // everyone online in its head and, inside Ruumble Client, Mumble's functions in its footer), in the middle the sign
  // of the own room, right tube mail, Ruumble in a box (#10), mute, deafen and the name badge (opens the user menu).
  let { app, building, floor }: { app: RuumbleState; building: Building; floor: Floor | null } = $props();
  // Ruumble Client: right click on the floor sign, a floor or the building opens Mumble's menu for that channel
  const admin = getDeskAdmin();

  const reversed = $derived([...building.floors].reverse());
  const me = $derived(app.me);
  const myFloor = $derived(building.floors.find((f) => f.isSelf) ?? null);
  const myPlace = $derived.by(() => {
    const self = building.self;
    if (!self || !me) return "";
    if (self.kind === "entrance") return t().common.entrance;
    if (self.kind === "hidden") return t().core.hiddenPlace;
    const name = app.snapshot?.channels.find((c) => c.id === me.channel)?.name ?? "";
    const place = self.kind === "corridor" ? t().common.corridor : name;
    return myFloor ? `${place} · ${t().floors.floor(myFloor.badge)}` : place;
  });
  const other = $derived(locale() === "de" ? "en" : "de");
  const muted = $derived(me ? me.selfMute || me.selfDeaf : false);
  const deaf = $derived(me?.selfDeaf ?? false);
  const myStatus = $derived(me?.status ?? null);
  const unread = $derived(app.chat.unread + app.desk.unread);
  const parcels = $derived(app.tube.waiting);
  const sending = $derived(app.tube.progress);
  const tubeLabel = $derived(
    [t().tube.title, parcels ? t().tube.waiting(parcels) : "", sending !== null ? t().tube.sending(Math.round(sending * 100)) : ""].filter(Boolean).join(", "),
  );
  const dnd = $derived(app.notices.settings.doNotDisturb);
  const myAvatar = $derived(me ? app.avatarOf(me.name) : null);
  let avatarBroken = $state<string | null>(null); // URL that could not be loaded → initials
  const hidden = $derived(building.self?.kind === "hidden");
  const place = $derived(app.snapshot ? ownPlace(building, app.snapshot) : null);
  // viewing another floor: the room sign leads back
  const away = $derived(!!myFloor && floor?.channelId !== myFloor.channelId);
  /** the place one is in, for the room menu (#15): a room, or the corridor / open floor (the floor channel) */
  const here = $derived.by(() => {
    const self = building.self;
    if (!self || !("floorId" in self) || app.readonly) return null;
    const f = building.floors.find((x) => x.channelId === self.floorId);
    if (!f) return null;
    const room = self.kind === "room" ? f.rooms.find((r) => r.channelId === self.channelId) : undefined;
    if (self.kind === "room" && !room) return null;
    return { space: room ?? f.corridor, kind: (room ? "room" : "floor") as "room" | "floor", floor: f };
  });
  // a newer Ruumble Client is out (#18): a dot on the name badge until the user menu was opened for it, an entry in it
  const update = $derived(app.clientUpdate);
  const updateDot = $derived(!!update && app.clientUpdateSeen !== update.version);
  $effect(() => {
    if (open === "user") app.markClientUpdateSeen();
  });
  const canEdit = $derived(!!here && here.space.canTend && app.desk.available && app.desk.canEditChannels);

  // how the user transmits, inside a Ruumble Client that knows it (#9 in ruumble-client): in push-to-talk the microphone
  // is the talk button (hold = talk, double click = keep open), mute moves into the menu below the small tab next to it
  const transmit = $derived(app.desk.transmit);
  const ptt = $derived(transmit?.mode === "ptt");
  /** transmitting, or the page's own press already down: the button, the line under the bar and the avatar react */
  const onAir = $derived(!!transmit && !!me && !muted && (transmit.transmitting || (ptt && (transmit.pressing || transmit.latched))));
  const micTitle = $derived.by(() => {
    if (!transmit || !ptt) return t().core.mute;
    if (muted) return t().transmit.mutedHint;
    if (transmit.latched) return t().transmit.latchedHint;
    if (!transmit.key.set) return t().transmit.holdNoKey;
    const key = keyText(transmit.key, t().transmit.keyNames);
    return transmit.key.scope === "window" ? t().transmit.holdWindow(key) : t().transmit.hold(key);
  });
  const keyProblem = $derived(ptt && !!transmit && (!transmit.key.set || transmit.key.scope === "window"));
  // the bound key while it only works in the window (Wayland): the page listens for it itself
  $effect(() => {
    const tr = transmit;
    if (!tr?.listensInWindow) return;
    return tr.listen(window);
  });

  // a press on the microphone: held with pointer capture, so letting go anywhere counts. A muted or latched microphone
  // does not talk on a press; its click unmutes or closes it (also a click without a press, e.g. from a screen reader)
  function micDown(e: PointerEvent): void {
    if (!transmit || !ptt || !me || e.button !== 0 || muted || transmit.latched) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // a pointer the browser no longer knows: then pointerup on the button itself still lets go
    }
    transmit.pressMouse(true);
  }
  function micUp(): void {
    transmit?.pressMouse(false);
  }
  function micClick(): void {
    if (!transmit || !ptt) {
      void app.toggleMute();
      return;
    }
    if (transmit.latched) transmit.setLatched(false);
    else if (muted) void app.toggleMute();
  }
  function micKey(e: KeyboardEvent, down: boolean): void {
    if (!transmit || !ptt || (e.key !== " " && e.key !== "Enter")) return;
    if (down && e.repeat) return e.preventDefault();
    if (!down || (!muted && !transmit.latched)) transmit.pressMouse(down);
  }

  // one dropdown at a time; closes on a choice, Escape (focus back to its button) and a click elsewhere
  let open = $state<"floors" | "user" | "room" | "transmit" | "listen" | null>(null);
  let listenButton = $state<HTMLButtonElement | null>(null);
  let modeButton = $state<HTMLButtonElement | null>(null);
  let floorsButton = $state<HTMLButtonElement | null>(null);
  let userButton = $state<HTMLButtonElement | null>(null);
  let roomButton = $state<HTMLButtonElement | null>(null);
  $effect(() => {
    if (!open) return;
    const which = open;
    const onclick = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest(`[data-dropdown="${which}"]`)) open = null; };
    const onkeydown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      open = null;
      (which === "floors" ? floorsButton : which === "room" ? roomButton : which === "transmit" ? modeButton : which === "listen" ? listenButton : userButton)?.focus();
    };
    window.addEventListener("click", onclick);
    window.addEventListener("keydown", onkeydown);
    return () => {
      window.removeEventListener("click", onclick);
      window.removeEventListener("keydown", onkeydown);
    };
  });
  const toggle = (which: "floors" | "user" | "room" | "transmit" | "listen") => (open = open === which ? null : which);

  // listening in (#19): a tab at the room sign while the user listens, with the rooms, their volume and the switch
  const listen = $derived(app.desk.listen);
  const listened = $derived(listen ? listenedRooms(building, listen.channels) : []);
  $effect(() => {
    if (open === "listen" && !listened.length) open = null;
  });

  /** a button in the elevator's footer: closes the elevator, then does its thing */
  function act(run: () => void): void {
    open = null;
    run();
  }

  function choose(f: Floor): void {
    app.showFloor(f);
    open = null;
  }
  /** keyboard: focus on the active floor or the first entry when a dropdown opens */
  function focusFirst(node: HTMLElement): void {
    (node.querySelector<HTMLElement>("[aria-current='page']") ?? node.querySelector<HTMLElement>("button:not([aria-disabled])"))?.focus();
  }
</script>

<header class="topbar" class:raised={open !== null} class:talking={onAir}>
  <div class="left">
    <div class="dropdown" data-dropdown="floors">
      <!-- the floor sign: a plate with the floor and its people, the elevator buttons on the right -->
      <button
        type="button" class="sign floor-sign" bind:this={floorsButton} aria-expanded={open === "floors"} aria-controls="elevator"
        aria-label={floor ? t().core.currentFloor(floor.level, floor.name, floor.population) : t().core.elevator}
        title={t().core.chooseFloor} onclick={() => toggle("floors")}
        oncontextmenu={(e) => contextMenu(admin, e, floor?.channelId ?? null)}
      >
        <span class="badge" aria-hidden="true">{#if floor}{floor.badge}{:else}<ArrowDownUp size={16} />{/if}</span>
        <span class="plate-text">
          {#if floor}<span class="caption" aria-hidden="true">{floor.level}</span>{/if}
          <span class="plate-name">
            <h1>{floor?.name ?? t().screens.vacancyTitle}</h1>
          </span>
        </span>
        <span class="call" aria-hidden="true"><ChevronDown size={18} class="chevron" /></span>
      </button>
      {#if open === "floors"}
        <!-- elevator panel: highest floor at the top, the entrance below the ground floor -->
        <nav id="elevator" class="elevator" class:bare={!app.desk.available} aria-label={t().core.elevatorLabel} {@attach focusFirst}>
          <div class="elevator-head">
            <span class="elevator-icon"><ArrowDownUp size={18} /></span>{t().core.elevator}
            <!-- everyone online, opens the building overview: cross-section and directory board (ADR-0019) -->
            <!-- right click in Ruumble Client: Mumble's menu of the whole building (the root channel: add a floor) -->
            <button type="button" class="overview-link" title={`${t().overview.open} (H)`} onclick={() => act(() => app.openOverview())} oncontextmenu={(e) => contextMenu(admin, e, 0)}>
              <span class="online"><span class="dot" aria-hidden="true"></span>{t().header.online(building.online)}</span>
              <Building2 size={15} aria-hidden="true" />
            </button>
          </div>
          {#each reversed as f (f.channelId)}
            {@const active = f.channelId === floor?.channelId}
            <button
              type="button" class="floor" data-floor={f.channelId} class:active class:mine={f.isSelf}
              aria-current={active ? "page" : undefined}
              aria-label={t().core.floorButton(f.level, f.name)}
              onclick={() => choose(f)}
              oncontextmenu={(e) => contextMenu(admin, e, f.channelId)}
            >
              <span class="fbadge">{f.badge}</span>
              <span class="ftext">
                <span class="fname"><span class="name">{f.name}</span><span class="fpeople" aria-hidden="true"><Users size={13} />{f.population}</span></span>
              </span>
            </button>
          {/each}
          <!-- building care and maintenance are beside the building in the building overview (ADR-0019) -->
          {#if building.entrance.length > 0}
            <section class="entrance" aria-label={t().common.entrance}>
              <div class="entrance-head">{t().common.entrance} · {countText(building.entrance.length)}</div>
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="entrance-people" oncontextmenu={(e) => contextMenu(admin, e, null)}>
                {#each building.entrance as user (user.session)}
                  <Avatar {user} talking={app.talking[user.session] ?? false} showName={false} />
                {/each}
              </div>
            </section>
          {/if}
          <!-- Ruumble Client (ADR-0024): Mumble's functions in the elevator's footer, from entering another building on
               the left to leaving on the right; Ctrl+, and F10 also work as keys -->
          {#if app.desk.available}
            <footer class="status">
              <button type="button" class="act" title={t().desk.cityMapHint} onclick={() => act(() => app.desk.openConnect())}>
                <MapIcon size={18} aria-hidden="true" />{t().desk.cityMap}
              </button>
              <div class="mumble" role="group" aria-label={t().desk.functions}>
                <button type="button" class="act icon" aria-label={t().desk.configuration} title={`${t().desk.configuration} (Ctrl+,)`} onclick={() => act(() => app.desk.openSettings())}>
                  <Settings size={18} aria-hidden="true" />
                </button>
                <button type="button" class="act icon" aria-label={t().desk.audioWizard} title={t().desk.audioWizard} onclick={() => act(() => app.desk.openAudioWizard())}>
                  <AudioLines size={18} aria-hidden="true" />
                </button>
                <button type="button" class="act icon" aria-label={t().desk.allFunctions} title={`${t().desk.allFunctions} (F10)`}
                  onclick={(e) => { const at = e.currentTarget; act(() => app.desk.showMenuAt(at)); }}>
                  <Menu size={18} aria-hidden="true" />
                </button>
              </div>
              <button type="button" class="act" title={t().desk.leaveHint} onclick={() => act(() => app.desk.disconnect())}>
                {t().desk.leave}<LogOut size={18} aria-hidden="true" />
              </button>
            </footer>
          {/if}
        </nav>
      {/if}
    </div>
    {#if app.readonly}<span class="note">{t().header.preview}</span>{/if}
    {#if hidden}<span class="note">{t().common.notShown}</span>{/if}
  </div>

  <!-- the sign of the own room; from another floor it leads back -->
  <div class="center">
    {#if place}
      {@const label = t().core.ownPlace(place.name, countText(place.people))}
      {#if away}
        <button type="button" class="sign room-sign" aria-label={`${label} – ${t().core.home}`} title={t().core.home} onclick={() => app.goHome()}>
          <span class="caption">{t().core.youAreHere}</span>
          <span class="plate-name"><span class="room-name">{place.name}</span><LocateFixed size={15} class="back" /></span>
        </button>
      {:else if here}
        <!-- the room menu (#15): only for the place one is in -->
        <div class="dropdown room-dropdown" data-dropdown="room">
          <button
            type="button" class="sign room-sign" bind:this={roomButton} aria-expanded={open === "room"} aria-controls="room-menu"
            aria-label={`${label} – ${t().roomMenu.open(place.name)}`} title={t().roomMenu.open(place.name)} onclick={() => toggle("room")}
          >
            <span class="caption">{t().core.youAreHere}</span>
            <span class="plate-name"><span class="room-name">{place.name}</span><ChevronDown size={15} class="chevron" aria-hidden="true" /></span>
          </button>
          {#if open === "room"}
            <div id="room-menu" class="menu room-menu" role="group" aria-label={t().roomMenu.label} {@attach focusFirst}>
              <div class="me-row">
                <span class="n">{place.name}</span>
                <span class="l">{t().floors.floor(here.floor.badge)} · {countText(place.people)}{#if here.space.recording} · {t().people.recording}{/if}</span>
              </div>
              <div class="quick" role="group" aria-label={t().core.quickSwitches}>
                <button type="button" class="tile" aria-pressed={app.boardOpen} aria-keyshortcuts={SHORTCUT_KEYS.toggleBoard.toUpperCase()}
                  title={`${t().roomMenu.board} (${SHORTCUT_KEYS.toggleBoard.toUpperCase()})`} onclick={() => { open = null; app.toggleBoard(); }}>
                  <span class="tile-icon"><BoardNotes /></span><span class="tile-label">{t().roomMenu.board}<kbd class="tile-key">{SHORTCUT_KEYS.toggleBoard.toUpperCase()}</kbd></span>
                </button>
                {#if here.space.canTend}
                  <button type="button" class="tile" onclick={() => { open = null; void app.openCare({ kind: here.kind, channelId: here.space.channelId }); }}>
                    <span class="tile-icon"><Plant size={18} /></span><span>{here.kind === "room" ? t().roomMenu.roomCare : t().roomMenu.floorCare}</span>
                  </button>
                {/if}
              </div>
              {#if canEdit}
                <hr class="sep" />
                <button type="button" class="item" onclick={() => { open = null; app.editChannelId = here.space.channelId; }}>
                  <Pencil size={18} aria-hidden="true" />{here.kind === "room" ? t().roomMenu.editRoom : t().roomMenu.editFloor}
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {:else}
        <div class="sign room-sign" role="status" aria-label={label}>
          <span class="caption">{t().core.youAreHere}</span>
          <span class="plate-name"><span class="room-name">{place.name}</span></span>
        </div>
      {/if}
    {/if}
    {#if listen && listened.length}
      <div class="dropdown listen-dropdown" data-dropdown="listen">
        <button
          type="button" class="listen-tab" bind:this={listenButton} aria-expanded={open === "listen"} aria-controls="listen-menu"
          aria-label={t().listen.tab(listened.length)} title={t().listen.tab(listened.length)} onclick={() => toggle("listen")}
        >
          <Ear size={16} aria-hidden="true" /><span class="listen-count" aria-hidden="true">{listened.length}</span>
        </button>
        {#if open === "listen"}
          <div id="listen-menu" class="menu listen-menu" role="group" aria-label={t().listen.title} {@attach focusFirst}>
            <div class="me-row"><span class="n">{t().listen.title}</span></div>
            {#each listened as room (room.channelId)}
              <div class="listen-row" data-listened={room.channelId}>
                <div class="listen-head">
                  <span class="listen-name">{room.name}</span>
                  <button type="button" class="listen-stop" aria-label={t().listen.stop(room.name)} onclick={() => listen.stop([room.channelId])}>{t().listen.stopOne}</button>
                </div>
                <ListenVolume room={room.name} volume={listen.volumeOf(room.channelId)} onvolume={(db) => listen.setVolume(room.channelId, db)} />
              </div>
            {/each}
            <label class="quieter">
              <input type="checkbox" checked={listen.quieter} onchange={(e) => listen.setQuieter((e.currentTarget as HTMLInputElement).checked)} />
              <span>{t().listen.quieter}</span>
            </label>
            <hr class="sep" />
            <button type="button" class="item" onclick={() => { open = null; listen.stopAll(); }}>
              <EarOff size={18} aria-hidden="true" />{t().listen.stopAll}
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="right">
    <!-- tube mail (ADR-0022): opens its panel; the number of parcels waiting for an answer, a ring while own ones are on their way -->
    <button
      type="button" class="tool tube" data-tube-button aria-pressed={app.tube.panel} aria-label={tubeLabel} title={tubeLabel}
      disabled={!me} onclick={() => app.tube.togglePanel()}
    >
      <Package size={20} />
      {#if sending !== null}
        <svg class="ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20" pathLength="100" stroke-dasharray={`${Math.max(4, sending * 100)} 100`} /></svg>
      {/if}
      {#if parcels}<span class="count" aria-hidden="true">{parcels > 99 ? "99+" : parcels}</span>{/if}
    </button>
    <!-- Ruumble in a box (#10): the room's log and the quiet words in one window; everything unread on it -->
    <button
      type="button" class="tool chat" data-chat-button aria-pressed={app.chat.panel === "open"} aria-keyshortcuts={SHORTCUT_KEYS.chat.toUpperCase()}
      aria-label={unread ? `${t().box.title}, ${t().chat.unread(unread)}` : t().box.title} title={`${t().box.title} (${SHORTCUT_KEYS.chat.toUpperCase()})`}
      disabled={!me && !app.desk.available} onclick={() => app.chat.toggle()}
    >
      <Inbox size={20} />
      {#if unread}<span class="count" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>{/if}
    </button>
    <!-- deafen and mute belong together: one joined pair, set apart from tube mail and the direct chat; the microphone
         comes second, so the small tab for the transmit mode next to it stays with it (#9 in ruumble-client) -->
    <div class="audio" role="group" aria-label={t().core.audio}>
    <button type="button" class="tool" aria-pressed={deaf} aria-label={t().core.deaf} title={t().core.deaf} disabled={!me} onclick={() => app.toggleDeaf()}>
      {#if deaf}<HeadphoneOff size={20} />{:else}<Headphones size={20} />{/if}
    </button>
    <button
      type="button" class="tool mic" class:on={onAir && ptt} class:voice={onAir && !ptt} aria-pressed={ptt ? undefined : muted}
      aria-label={micTitle} title={micTitle} disabled={!me} data-mic
      onpointerdown={micDown} onpointerup={micUp} onpointercancel={micUp} onlostpointercapture={micUp} onclick={micClick}
      ondblclick={() => { if (transmit && ptt && !muted && !transmit.latched) transmit.setLatched(true); }}
      onkeydown={(e) => micKey(e, true)} onkeyup={(e) => micKey(e, false)}
    >
      {#if transmit && ptt}<span class="fill" aria-hidden="true"><i style:height={`${onAir ? transmit.level * 100 : 0}%`}></i></span>{/if}
      {#if muted}<MicOff size={20} />{:else}<Mic size={20} />{/if}
      {#if transmit && !muted}
        <span class="mode-badge" class:locked={ptt && transmit.latched} class:warn={keyProblem && !transmit.latched} aria-hidden="true">
          {#if ptt && transmit.latched}<Lock size={10} strokeWidth={2.5} />
          {:else if ptt && !transmit.key.set}<TriangleAlert size={10} strokeWidth={2.5} />
          {:else if ptt && transmit.key.scope === "window"}<Monitor size={10} strokeWidth={2.5} />
          {:else if ptt}<Keyboard size={10} strokeWidth={2.5} />
          {:else if transmit.mode === "continuous"}<CircleDot size={10} strokeWidth={2.5} />
          {:else}<AudioLines size={10} strokeWidth={2.5} />{/if}
        </span>
      {/if}
    </button>
    {#if transmit}
      <div class="dropdown mode" data-dropdown="transmit">
        <button
          type="button" class="tool mode-tab" bind:this={modeButton} aria-expanded={open === "transmit"} aria-controls="transmit-menu"
          aria-label={t().transmit.modeTab} title={t().transmit.modeIs(t().transmit.modes[transmit.mode])} onclick={() => toggle("transmit")}
        >
          <ChevronDown size={14} />
        </button>
        {#if open === "transmit"}
          <TransmitMenu
            {transmit} {muted} ontogglemute={() => void app.toggleMute()} onsettings={() => app.desk.openSettings()}
            onwizard={() => app.desk.openAudioWizard()} onclose={() => (open = null)}
          />
        {/if}
      </div>
    {/if}
    </div>
    <div class="dropdown" data-dropdown="user">
      <!-- the name badge: yellow band like the ring around the own avatar, on a clip -->
      <button type="button" class="me" bind:this={userButton} aria-expanded={open === "user"} aria-controls="user-menu" aria-label={updateDot ? `${t().core.userMenu}, ${t().core.clientUpdateDot}` : t().core.userMenu} title={updateDot ? t().core.clientUpdateDot : t().core.userMenu} onclick={() => toggle("user")}>
        {#if updateDot}<span class="update-dot" aria-hidden="true"></span>{/if}
        <span class="av-me" aria-hidden="true">
          {#if me && myAvatar && avatarBroken !== myAvatar}<img src={myAvatar} alt="" onerror={() => (avatarBroken = myAvatar)} />{:else if me}{initials(me.name)}{:else}<UserIcon size={18} />{/if}
        </span>
        <span class="me-text"><span class="caption">{t().core.nameTag}</span><span class="me-name">{me?.name ?? t().header.preview}</span></span>
        <ChevronDown size={18} class="chevron" aria-hidden="true" />
      </button>
      <!-- notices muted ("do not disturb" in the code, ADR-0023): a sign at the bottom left of the badge's avatar, the
           counterpart of the status tag at the top right; only while it is on, a click turns it off. This browser only -->
      {#if dnd}
        <button type="button" class="dnd-sign" aria-label={t().notices.doNotDisturbOn}
          title={`${t().notices.doNotDisturbOn}\n${t().notices.doNotDisturbOff}`} onclick={() => app.notices.setDoNotDisturb(false)}>
          <span class="dnd-face"><BellOff size={12} strokeWidth={2.5} aria-hidden="true" /></span>
        </button>
      {/if}
      <!-- the own status (B, ADR-0018): a tag at the avatar of the name badge, as at every avatar in the floor plan;
           its text in the tooltip, dashed while none is set. A button of its own: the badge opens the user menu -->
      {#if me}
        <button type="button" class="status-tag" class:set={!!myStatus} aria-pressed={!!myStatus} aria-label={t().status.title} aria-keyshortcuts="S"
          title={myStatus ? statusText(myStatus) : `${t().status.set} (S)`} onclick={() => void app.openStatus()}>
          <span class="tag-face"><Tag size={12} strokeWidth={2.5} /></span>
        </button>
      {/if}
      {#if open === "user"}
        <div id="user-menu" class="menu" role="group" aria-label={t().core.userMenu} {@attach focusFirst}>
          {#if me}
            <div class="me-row"><span class="n">{me.name}</span><span class="l">{myPlace}</span></div>
          {/if}
          <!-- quick switches: the three settings of this browser that are switched often, as tiles at the top -->
          <div class="quick" role="group" aria-label={t().core.quickSwitches}>
            <!-- notices muted ("do not disturb" in the code, ADR-0023), also from the sign at the avatar -->
            <button type="button" class="tile" aria-pressed={dnd} onclick={() => app.notices.setDoNotDisturb(!dnd)}>
              <BellOff size={18} aria-hidden="true" /><span>{t().notices.doNotDisturb}</span>
            </button>
            <!-- the light of the building (the theme): the system setting until chosen here, then remembered in this browser;
                 the tile says what a click does and stays dark while the light is off -->
            <button type="button" class="tile" class:on={theme() === "dark"} onclick={() => setTheme(theme() === "dark" ? "light" : "dark")}>
              {#if theme() === "dark"}<Lightbulb size={18} aria-hidden="true" /><span>{t().core.lightOn}</span>
              {:else}<LightbulbOff size={18} aria-hidden="true" /><span>{t().core.lightOff}</span>{/if}
            </button>
            <!-- language: German or English (browser setting), switchable here and remembered; the tile names the other one -->
            <button type="button" class="tile" aria-label={t().core.switchLanguage(t().core.languageName[other])} onclick={() => setLocale(other)}>
              <Languages size={18} aria-hidden="true" /><span>{t().core.languageName[other]}</span>
            </button>
          </div>
          <hr class="sep" />
          {#if update && app.desk.clientVersion}
            <a class="item update" href={update.url} target="_blank" rel="noopener noreferrer" title={t().core.clientUpdateHint(app.desk.clientVersion)} onclick={() => (open = null)}>
              <CircleArrowDown size={18} aria-hidden="true" />{t().core.clientUpdate(update.version)}
            </a>
          {/if}
          <button type="button" class="item" disabled={!myFloor} onclick={() => { app.goHome(); open = null; }}>
            <LocateFixed size={18} aria-hidden="true" />{t().core.home}
          </button>
          <!-- my status, also with S and from the tag at the avatar (ADR-0018) -->
          <button type="button" class="item" onclick={() => { open = null; void app.openStatus(); }}>
            <Tag size={18} aria-hidden="true" />{t().status.menu}<kbd class="key">S</kbd>
          </button>
          <!-- what Ruumble does when something happens in the room, for this browser (ADR-0023) -->
          <button type="button" class="item" onclick={() => { open = null; app.noticesOpen = true; }}>
            <Bell size={18} aria-hidden="true" />{t().notices.menu}
          </button>
          <hr class="sep" />
          <!-- my keys: the own paired browsers (ADR-0015) -->
          <button type="button" class="item" disabled={!me} onclick={() => { open = null; void app.openKeys(); }}>
            <span class="key-icon" aria-hidden="true"><Key size={18} /></span>{t().keys.myKeys}
          </button>
          <!-- the keyboard shortcuts, also with ? -->
          <button type="button" class="item" onclick={() => { open = null; app.helpOpen = true; }}>
            <Keyboard size={18} aria-hidden="true" />{t().shortcuts.menu}<kbd class="key">?</kbd>
          </button>
          <!-- what is new in this version: its public page on GitHub (#17), in the system browser inside Ruumble Client -->
          <a class="item" href={__WHATS_NEW_URL__} target="_blank" rel="noopener noreferrer" onclick={() => (open = null)}>
            <Sparkles size={18} aria-hidden="true" />{t().core.whatsNew}
          </a>
          <div class="versions"><span>{t().core.server(building.serverVersion)}</span><span>{t().core.ui(__UI_VERSION__)}</span></div>
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .topbar { position: relative; z-index: 5; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; min-height: var(--topbar-height); }
  /* an open dropdown lies above the panels at the bottom (the box, the chat, tube mail), below the toasts */
  .topbar.raised { z-index: 26; }
  .left, .right { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .right { justify-self: end; }
  .dropdown { position: relative; min-width: 0; }
  .note { font-size: 13px; font-weight: 700; color: var(--color-link); white-space: nowrap; }
  .caption { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; line-height: 1.2; }
  .plate-name { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
  .sign:focus-visible, .me:focus-visible, .tool:focus-visible, .item:focus-visible, .floor:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 2px; }

  /* signs: plates with a screw in every corner */
  .sign {
    position: relative; border-radius: 6px; text-align: left; font: inherit;
    --screw: radial-gradient(circle, var(--screw-color) 1.6px, transparent 2.2px);
    background-image: var(--screw), var(--screw), var(--screw), var(--screw), var(--plate);
    background-size: 10px 10px, 10px 10px, 10px 10px, 10px 10px, 100% 100%;
    background-position: 2px 2px, calc(100% - 2px) 2px, 2px calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), 0 0;
    background-repeat: no-repeat;
  }

  /* floor sign: dark like the elevator panel; on the right the elevator buttons make the action obvious */
  .floor-sign {
    --plate: var(--gradient-elevator); --screw-color: rgb(255 255 255 / 0.45);
    display: flex; align-items: center; gap: 12px; max-width: 100%; min-height: 56px; padding: 6px 6px 6px 12px; border: 0;
    color: var(--color-white); cursor: pointer; box-shadow: 0 2px 0 rgb(0 30 60 / 0.35), 0 4px 10px rgb(0 56 105 / 0.18);
    transition: transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
  }
  .floor-sign:hover { transform: translateY(-1px); box-shadow: 0 3px 0 rgb(0 30 60 / 0.35), 0 6px 14px rgb(0 56 105 / 0.25); }
  .floor-sign[aria-expanded="true"] { transform: translateY(1px); box-shadow: 0 1px 0 rgb(0 30 60 / 0.35); }
  .badge {
    width: 38px; height: 38px; flex-shrink: 0; border-radius: 50%; border: 2px solid rgb(255 255 255 / 0.7);
    display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px;
  }
  .plate-text { min-width: 0; }
  .floor-sign .caption { color: var(--color-plate-muted); }
  h1 { margin: 0; font-size: 20px; line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .call {
    display: flex; align-items: center; justify-content: center; width: 24px; height: 44px; margin-left: 2px; flex-shrink: 0;
    color: var(--color-white);
  }
  .call :global(.chevron), .me :global(.chevron) { flex-shrink: 0; transition: transform var(--dur) var(--ease-out); }
  .floor-sign[aria-expanded="true"] :global(.chevron), .me[aria-expanded="true"] :global(.chevron) { transform: rotate(180deg); }

  /* the elevator panel as a dropdown */
  .elevator {
    position: absolute; left: 0; top: calc(100% + 8px); width: 380px; max-width: calc(100vw - 32px); max-height: calc(100vh - 120px); overflow-y: auto;
    border-radius: var(--radius-md); padding: 12px 12px 0; background: var(--gradient-elevator); color: var(--color-white);
    display: flex; flex-direction: column; gap: 6px; box-shadow: 0 10px 28px rgb(0 56 105 / 0.35);
    transform-origin: top left; animation: drop 160ms var(--ease-out) both;
  }
  .elevator.bare { padding-bottom: 12px; }
  @keyframes drop { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: none; } }
  .elevator-head { display: flex; align-items: center; gap: 10px; padding: 2px 6px 8px; border-bottom: 1px solid rgb(255 255 255 / 0.2); font-size: 15px; font-weight: 700; }
  .elevator-icon { display: inline-flex; color: var(--color-sky); }
  .floor {
    display: flex; align-items: center; gap: 12px; width: 100%; min-height: 48px; padding: 4px 10px; border: 0; flex-shrink: 0;
    border-radius: var(--radius-md); background: transparent; color: var(--color-white); text-align: left; cursor: pointer;
    transition: background var(--dur) var(--ease-out);
  }
  .floor:hover { background: rgb(255 255 255 / 0.08); }
  .floor.active, .floor.active:hover { background: var(--color-paper); color: var(--color-ink); }
  .fbadge {
    width: 40px; height: 40px; flex-shrink: 0; border: 2px solid rgb(255 255 255 / 0.6); border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;
  }
  /* own floor: the yellow ring of the own avatar */
  .floor.mine .fbadge { box-shadow: 0 0 0 2px var(--color-accent); }
  .floor.active .fbadge { border-color: var(--color-ink); background: var(--color-ink); color: var(--color-paper); }
  .ftext { min-width: 0; }
  .fname { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
  .name { font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fpeople { display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; font-size: 13px; font-weight: 700; color: var(--color-plate-muted); font-variant-numeric: tabular-nums; }
  .floor.active .fpeople { color: var(--color-blue-700); }
  .entrance { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; padding: 10px 6px 2px; border-top: 1px solid rgb(255 255 255 / 0.2); }
  .entrance-head { display: flex; align-items: center; gap: 8px; min-height: 28px; font-size: 13px; font-weight: 700; color: var(--color-plate-muted); }
  .key-icon { display: inline-flex; }
  .entrance-people { display: flex; flex-wrap: wrap; gap: 4px; }
  .entrance-people :global(.person) { width: 48px; }
  /* status bar at the bottom of the elevator, like the display in a lift */
  /* everyone online, right-aligned in the elevator's head */
  .overview-link {
    display: flex; align-items: center; gap: 8px; margin: -4px -6px -4px auto; padding: 4px 6px; border: 0; border-radius: var(--radius-md);
    background: transparent; color: inherit; font: inherit; font-size: 13px; cursor: pointer; white-space: nowrap;
  }
  .overview-link:hover { background: rgb(255 255 255 / 0.1); }
  .overview-link:focus-visible, .act:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 0; }
  .online { display: inline-flex; align-items: center; gap: 8px; font-variant-numeric: tabular-nums; }
  /* Mumble's functions at the bottom of the elevator, like the buttons below a lift's display */
  .status {
    position: sticky; bottom: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px;
    margin: 6px -12px 0; padding: 8px 10px; background: rgb(0 20 45 / 0.45); border-top: 1px solid rgb(255 255 255 / 0.15);
    font-size: 13px; font-weight: 700; white-space: nowrap;
  }
  .act {
    display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 8px; border: 0; border-radius: var(--radius-md);
    background: transparent; color: var(--color-white); font: inherit; cursor: pointer;
  }
  .act:hover { background: rgb(255 255 255 / 0.12); }
  .act.icon { width: 34px; padding: 0; justify-content: center; }
  .mumble { display: flex; border: 1px solid rgb(255 255 255 / 0.25); border-radius: var(--radius-md); }
  .mumble .act { border-radius: 0; }
  .mumble .act + .act { border-left: 1px solid rgb(255 255 255 / 0.25); }
  .mumble .act:first-child { border-radius: var(--radius-md) 0 0 var(--radius-md); }
  .mumble .act:last-child { border-radius: 0 var(--radius-md) var(--radius-md) 0; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-sky); box-shadow: 0 0 0 3px rgb(90 166 231 / 0.25); }

  /* room sign: light blue like the own room, a door plate */
  .center { display: flex; justify-content: center; min-width: 0; }
  .room-sign {
    --plate: linear-gradient(var(--color-blue-100), var(--color-blue-100)); --screw-color: var(--color-blue-500);
    display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; min-height: 52px; max-width: 360px; padding: 5px 22px;
    border: 2px solid var(--color-ink); color: var(--color-ink); box-shadow: 0 2px 0 rgb(0 56 105 / 0.2);
  }
  .room-sign .caption { color: var(--color-blue-700); }
  .room-name { font-size: 17px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  button.room-sign { cursor: pointer; transition: transform var(--dur) var(--ease-out); }
  button.room-sign:hover { transform: translateY(-1px); }
  button.room-sign[aria-expanded="true"] { transform: translateY(1px); }
  .room-sign :global(.chevron) { flex-shrink: 0; align-self: center; color: var(--color-link); transition: transform var(--dur) var(--ease-out); }
  .room-sign[aria-expanded="true"] :global(.chevron) { transform: rotate(180deg); }
  /* the room menu hangs centred below the room sign */
  .menu.room-menu { right: auto; left: 50%; width: 260px; margin-left: -130px; transform-origin: top center; box-sizing: border-box; }
  .tile-label { display: inline-flex; align-items: center; gap: 5px; }
  .tile-key {
    min-width: 16px; padding: 0 4px; border: 1px solid currentColor; border-radius: 3px; opacity: 0.7;
    font: inherit; font-size: 10px; line-height: 14px; text-align: center;
  }
  .room-menu .quick { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 1fr; }
  .tile-icon { position: relative; display: inline-flex; height: 22px; align-items: center; }
  .room-sign :global(.back) { flex-shrink: 0; align-self: center; color: var(--color-link); }
  /* listening in (#19): a small tab hanging at the right of the room sign, the list below it */
  .listen-dropdown { flex: none; align-self: center; }
  .listen-tab {
    display: flex; align-items: center; gap: 3px; height: 36px; padding: 0 9px 0 7px; margin-left: -2px;
    border: 2px solid var(--color-ink); border-left-width: 0; border-radius: 0 var(--radius-md) var(--radius-md) 0;
    background: var(--color-blue-100); color: var(--color-link); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
    box-shadow: 0 2px 0 rgb(0 56 105 / 0.2); transition: transform var(--dur) var(--ease-out);
  }
  .listen-tab:hover { transform: translateY(-1px); }
  .listen-tab[aria-expanded="true"] { transform: translateY(1px); }
  .listen-tab:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 2px; }
  .listen-count { color: var(--color-ink); }
  .menu.listen-menu { right: auto; left: 50%; width: 300px; margin-left: -150px; transform-origin: top center; box-sizing: border-box; }
  .listen-row { display: flex; flex-direction: column; gap: 4px; padding: 6px 10px 8px; border-bottom: 1px solid var(--color-blue-100); }
  .listen-head { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .listen-name { flex: 1; min-width: 0; font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .listen-stop {
    flex: none; padding: 3px 9px; border: 1px solid var(--color-blue-300); border-radius: var(--radius-md); background: transparent;
    color: var(--color-ink); font: inherit; font-size: 12px; cursor: pointer;
  }
  .listen-stop:hover { background: var(--color-blue-100); }
  .listen-stop:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 1px; }
  .quieter { display: flex; align-items: center; gap: 8px; padding: 8px 10px 4px; font-size: 13px; cursor: pointer; }
  .quieter input { width: 16px; height: 16px; margin: 0; accent-color: var(--color-blue-500); cursor: pointer; flex: none; }
  .quieter input:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 2px; }

  .tool {
    width: 40px; height: 40px; border: 1px solid var(--color-blue-300); border-radius: var(--radius-md); background: var(--color-paper);
    display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--color-ink); flex-shrink: 0;
    transition: background var(--dur) var(--ease-out);
  }
  .tool:hover { background: var(--color-blue-100); }
  .tool[aria-pressed="true"] { background: var(--color-ink); border-color: var(--color-ink); color: var(--color-paper); }
  .tool:disabled { opacity: 0.5; cursor: not-allowed; }
  .chat, .tube { position: relative; }
  /* own parcels on their way: a ring around the button that fills up */
  .ring { position: absolute; inset: -3px; width: calc(100% + 6px); height: calc(100% + 6px); transform: rotate(-90deg); pointer-events: none; overflow: visible; }
  .ring circle { fill: none; stroke: var(--color-blue-500); stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 400ms var(--ease-out); }
  /* mute and deafen: a joined pair with a little room before it */
  .audio { display: flex; margin-left: 10px; border-radius: var(--radius-md); box-shadow: 0 1px 0 rgb(0 56 105 / 0.12); }
  .audio .tool { border-radius: 0; background: var(--color-surface); }
  .audio > .tool:first-child { border-radius: var(--radius-md) 0 0 var(--radius-md); }
  .audio > .tool + .tool { border-left: 0; }
  .audio > .tool:last-child { border-radius: 0 var(--radius-md) var(--radius-md) 0; }
  /* the small tab for the transmit mode at the end, after the microphone (#9 in ruumble-client) */
  .audio .mode { display: flex; }
  .audio .mode-tab { width: 20px; border-left: 0; border-radius: 0 var(--radius-md) var(--radius-md) 0; color: var(--color-blue-700); }
  .audio .mode-tab :global(svg) { transition: transform var(--dur) var(--ease-out); }
  .audio .mode-tab[aria-expanded="true"] :global(svg) { transform: rotate(180deg); }
  /* the microphone: a sign of the mode in its corner; in push-to-talk it fills sky blue while talking, pulses like the
     talking ring at the avatars, and the level rises inside it */
  .mic { position: relative; touch-action: none; user-select: none; -webkit-user-select: none; }
  .mic :global(svg) { position: relative; }
  .mic .fill { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; pointer-events: none; }
  .mic .fill i { position: absolute; left: 0; right: 0; bottom: 0; height: 0; background: rgb(255 255 255 / 0.3); transition: height 70ms linear; }
  .mode-badge {
    position: absolute; right: 2px; bottom: 2px; width: 14px; height: 14px; border-radius: 4px; display: flex; align-items: center; justify-content: center;
    background: var(--color-paper); color: var(--color-link); box-shadow: 0 0 0 1px var(--color-blue-300);
  }
  .mode-badge.warn { background: var(--color-brass); color: var(--color-white); box-shadow: 0 0 0 1px var(--color-brass); }
  .mode-badge.locked { background: var(--color-ink); color: var(--color-paper); box-shadow: 0 0 0 1px var(--color-ink); }
  .audio .tool.mic.on { z-index: 1; border-color: var(--color-sky); background: var(--color-sky); color: var(--color-white); }
  .mic.on::after {
    content: ""; position: absolute; inset: -6px; border: 2px solid var(--color-sky); border-radius: 8px; pointer-events: none;
    animation: mic-pulse 1.1s var(--ease-out) infinite;
  }
  .mic.on .mode-badge { color: var(--color-sky); box-shadow: 0 0 0 1px var(--color-sky); }
  .mic.on .mode-badge.locked { background: var(--color-ink); color: var(--color-paper); }
  .mic.voice { box-shadow: inset 0 0 0 2px var(--color-sky); }
  @keyframes mic-pulse { from { opacity: 0.9; transform: scale(0.92); } to { opacity: 0; transform: scale(1.3); } }
  /* while transmitting the line under the whole bar lights up: visible from the corner of the eye */
  .topbar::after {
    content: ""; position: absolute; left: 0; right: 0; bottom: -3px; height: 3px; border-radius: 2px; background: var(--color-sky);
    box-shadow: 0 0 12px 1px var(--color-sky); opacity: 0; pointer-events: none; transition: opacity 120ms linear;
  }
  .topbar.talking::after { opacity: 1; animation: bar-glow 1.1s ease-in-out infinite alternate; }
  @keyframes bar-glow { from { opacity: 0.45; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .mic.on::after, .topbar.talking::after { animation: none; }
    .mic .fill i { transition: none; }
  }
  .audio .tool:hover { background: var(--color-blue-100); }
  .audio .tool[aria-pressed="true"] { background: var(--color-ink); border-color: var(--color-ink); }
  .audio .tool:disabled:hover { background: var(--color-surface); }
  .chat .count, .tube .count {
    position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; box-sizing: border-box;
    background: var(--color-ink); color: var(--color-paper); box-shadow: 0 0 0 2px var(--color-paper);
    font-size: 11px; font-weight: 700; line-height: 18px; text-align: center; font-variant-numeric: tabular-nums;
  }
  .chat[aria-pressed="true"] .count, .tube[aria-pressed="true"] .count { background: var(--color-paper); color: var(--color-ink); box-shadow: 0 0 0 2px var(--color-ink); }
  .tool:disabled:hover { background: var(--color-paper); }

  /* name badge: white card with a yellow band, hanging on a clip */
  .me {
    position: relative; display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 9px 10px 5px 8px; margin: 6px 0 0 6px;
    border: 1px solid var(--color-blue-300); border-top: 5px solid var(--color-accent); border-radius: 6px;
    background: var(--color-paper); color: var(--color-ink); cursor: pointer; text-align: left;
    box-shadow: 0 2px 0 rgb(0 56 105 / 0.15), 0 4px 10px rgb(0 56 105 / 0.12);
    transition: transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
  }
  .me::before {
    content: ""; position: absolute; top: -11px; left: 50%; width: 22px; height: 8px; margin-left: -11px;
    border-radius: 3px 3px 1px 1px; background: var(--color-blue-300); box-shadow: inset 0 -2px 0 rgb(0 56 105 / 0.2);
  }
  .me:hover { transform: rotate(-1deg) translateY(-1px); }
  .me[aria-expanded="true"] { background: var(--color-surface); }
  .me :global(.chevron) { color: var(--color-link); }
  .av-me {
    width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%; background: var(--color-ink); color: var(--color-paper);
    box-shadow: 0 0 0 2px var(--color-accent); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; overflow: hidden;
  }
  .av-me img { width: 100%; height: 100%; object-fit: cover; }
  /* the status tag on the badge's avatar: a 28 px target around a 22 px tag like the one in the floor plan */
  .status-tag {
    position: absolute; left: 34px; top: 7px; width: 28px; height: 28px; padding: 0; border: 0; background: none; cursor: pointer;
    display: grid; place-items: center; z-index: 1;
  }
  .tag-face {
    width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; box-sizing: border-box;
    background: var(--color-paper); border: 1px dashed var(--color-blue-300); color: var(--color-blue-700);
    transition: transform var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out);
  }
  /* set: filled like the tag at every avatar in the floor plan, so it stands out */
  .status-tag.set .tag-face { width: 24px; height: 24px; background: var(--color-ink); border: 2px solid var(--color-paper); color: var(--color-paper); box-shadow: 0 1px 3px rgb(0 56 105 / 0.35); }
  .status-tag.set:hover .tag-face { border-color: var(--color-paper); color: var(--color-paper); }
  .status-tag:hover .tag-face { transform: scale(1.1); border-color: var(--color-ink); color: var(--color-ink); }
  .status-tag:focus-visible { outline: none; }
  .status-tag:focus-visible .tag-face { outline: 3px solid var(--color-sky); outline-offset: 1px; }
  /* notices muted: a filled 22 px sign in a 28 px target at the bottom left of the badge's avatar, like the set status tag */
  .dnd-sign {
    position: absolute; left: 0; top: 38px; width: 28px; height: 28px; padding: 0; border: 0; background: none; cursor: pointer;
    display: grid; place-items: center; z-index: 1;
  }
  .dnd-face {
    width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; box-sizing: border-box;
    background: var(--color-ink); border: 2px solid var(--color-paper); color: var(--color-paper); box-shadow: 0 1px 3px rgb(0 56 105 / 0.35);
    transition: transform var(--dur) var(--ease-out);
  }
  .dnd-sign:hover .dnd-face { transform: scale(1.1); }
  .dnd-sign:focus-visible { outline: none; }
  .dnd-sign:focus-visible .dnd-face { outline: 3px solid var(--color-sky); outline-offset: 1px; }
  .me-text { min-width: 0; }
  .me .caption { color: var(--color-link); }
  .me-name { display: block; font-size: 15px; font-weight: 700; white-space: nowrap; }
  .menu {
    position: absolute; right: 0; top: calc(100% + 6px); min-width: 260px; display: flex; flex-direction: column; gap: 2px; padding: 6px;
    --color-paper: var(--color-raised); border: 1px solid var(--color-blue-300); border-radius: var(--radius-md); background: var(--color-paper); box-shadow: 0 0 0 1px var(--color-raised-edge), 0 10px 28px rgb(0 56 105 / 0.2);
    transform-origin: top right; animation: drop 160ms var(--ease-out) both;
  }
  .me-row { display: flex; flex-direction: column; padding: 8px 10px 10px; margin-bottom: 4px; border-bottom: 1px solid var(--color-blue-100); }
  .me-row .n { font-size: 15px; font-weight: 700; }
  .me-row .l { font-size: 13px; color: var(--color-blue-700); }
  .item {
    display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 10px; border: 0; border-radius: var(--radius-md);
    background: none; color: var(--color-ink); font-size: 14px; text-align: left; cursor: pointer;
  }
  .item:hover { background: var(--color-blue-100); }
  a.item { text-decoration: none; }
  a.item.update { font-weight: 700; color: var(--color-link); }
  /* a newer Ruumble Client: a dot on the name badge's band, like a note pinned to it */
  .update-dot {
    position: absolute; top: -9px; right: -5px; width: 12px; height: 12px; border-radius: 50%;
    background: var(--color-alert); box-shadow: 0 0 0 2px var(--color-paper);
  }
  .item .key { margin-left: auto; min-width: 20px; padding: 0 5px; border: 1px solid var(--color-blue-300); border-radius: 4px; font: inherit; font-size: 12px; font-weight: 700; text-align: center; color: var(--color-blue-700); }
  .item:disabled { opacity: 0.5; cursor: not-allowed; }
  .item:disabled:hover { background: none; }
  .sep { width: 100%; margin: 4px 0; border: 0; border-top: 1px solid var(--color-blue-100); }
  /* the quick switches: three tiles side by side, filled while on */
  .quick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 2px 0 4px; }
  .tile {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 64px; padding: 8px 4px;
    border: 1px solid var(--color-blue-300); border-radius: var(--radius-md); background: none; color: var(--color-ink);
    font-size: 12px; font-weight: 700; line-height: 1.25; text-align: center; cursor: pointer;
    transition: background var(--dur) var(--ease-out);
  }
  .tile:hover { background: var(--color-blue-100); }
  .tile[aria-pressed="true"], .tile.on { background: var(--color-ink); border-color: var(--color-ink); color: var(--color-paper); }
  .tile:focus-visible { outline: 3px solid var(--color-sky); outline-offset: 2px; }
  .versions { display: flex; justify-content: space-between; gap: 12px; padding: 10px 10px 4px; margin-top: 4px; border-top: 1px solid var(--color-blue-100); font-size: 12px; color: var(--color-blue-700); }
</style>

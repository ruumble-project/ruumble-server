import { expect, test, type Page } from "@playwright/test";
import { gotoFloor } from "./topbar.ts";

// Listening in on another room of the own floor (#19). The client's "desk" object is faked as QWebChannel hands it
// over: it confirms like Mumble's server after a moment, or refuses with `window.refuse`.
async function asDesk(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const calls: unknown[] = [];
    const w = window as unknown as { deskCalls: unknown[]; refuse?: string };
    w.deskCalls = calls;
    const handlers: Record<string, ((...a: unknown[]) => void)[]> = {};
    const signal = (name: string) => ({ connect: (h: (...a: unknown[]) => void) => void (handlers[name] ??= []).push(h) });
    const emit = (name: string, ...a: unknown[]) => handlers[name]?.forEach((h) => h(...a));
    const desk = {
      version: "1.6.0",
      server: "127.0.0.1:64738",
      history: (cb: (entries: unknown[]) => void) => cb([]),
      sendMessage: (_text: string, cb: (ok: boolean) => void) => cb(true),
      openSettings: () => {},
      openConnect: () => {},
      openAudioWizard: () => {},
      disconnectServer: () => {},
      showMenu: () => {},
      logged: { connect: () => {} },
      serverChanged: { connect: () => {} },
      listening: [] as { channel: number; volume: number }[],
      listenQuieter: true,
      listeningChanged: signal("listeningChanged"),
      listenQuieterChanged: signal("listenQuieterChanged"),
      listeningRefused: signal("listeningRefused"),
      startListening: (channel: number) => {
        calls.push(["start", channel]);
        setTimeout(() => {
          if (w.refuse) return emit("listeningRefused", channel, w.refuse);
          desk.listening = [...desk.listening, { channel, volume: 0 }];
          emit("listeningChanged");
        }, 150);
      },
      stopListening: (channels: number[]) => {
        calls.push(["stop", channels]);
        setTimeout(() => {
          desk.listening = desk.listening.filter((l) => !channels.includes(l.channel));
          emit("listeningChanged");
        }, 100);
      },
      setListeningVolume: (channel: number, db: number) => {
        calls.push(["volume", channel, db]);
        desk.listening = desk.listening.map((l) => (l.channel === channel ? { ...l, volume: db } : l));
        emit("listeningChanged");
      },
      setListenQuieter: (on: boolean) => {
        calls.push(["quieter", on]);
        desk.listenQuieter = on;
        emit("listenQuieterChanged");
      },
    };
    Object.assign(window, {
      qt: { webChannelTransport: {} },
      QWebChannel: class {
        constructor(_transport: unknown, ready: (channel: { objects: { desk: typeof desk } }) => void) {
          ready({ objects: { desk } });
        }
      },
    });
  });
}

const calls = (page: Page) => page.evaluate(() => (window as unknown as { deskCalls: unknown[] }).deskCalls);
const door = (page: Page, room: string) => page.getByRole("button", { name: new RegExp(`^(Listen in on|Stop listening to|Opening the door to) ${room}`) });

test("in a browser the doors are only drawings: no listening without Ruumble Client", async ({ page }) => {
  await page.goto("/?fixture=sample&talking=0");
  await expect(page.locator("[data-channel]").first()).toBeVisible();
  await expect(page.locator("button[data-door]")).toHaveCount(0);
});

test("a click on a door listens in, at a discreet volume; the tab in the top bar lists it, Stop all ends it", async ({ page }) => {
  await asDesk(page);
  await page.goto("/?fixture=sample&talking=0");
  // every other room of the own floor has a door to click; the own room has none
  await expect(page.locator("button[data-door]")).toHaveCount(4);
  await expect(door(page, "Let's talk")).toHaveCount(0);

  const play = door(page, "Let's play");
  await expect(play).toHaveAttribute("aria-pressed", "false");
  await play.click();
  await expect(page.getByRole("button", { name: "Stop listening to Let's play" })).toHaveAttribute("aria-pressed", "true");
  expect(await calls(page)).toEqual([["start", 4], ["volume", 4, -15]]);

  // the volume tag beside the open door
  await page.getByRole("button", { name: "Volume for Let's play" }).click();
  const popup = page.getByRole("dialog", { name: "Volume for Let's play" });
  const slider = popup.getByRole("slider", { name: "Volume for Let's play" });
  await expect(slider).toHaveValue("-15");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  expect((await calls(page)).at(-1)).toEqual(["volume", 4, -14]);
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();

  // the tab at the room sign: the room, its volume, the attenuation switch (on by default)
  await page.getByRole("button", { name: "You are listening in on 1 room" }).click();
  const menu = page.getByRole("group", { name: "Listening in" });
  await expect(menu.getByText("Let's play")).toBeVisible();
  await expect(menu.getByRole("slider", { name: "Volume for Let's play" })).toHaveValue("-14");
  const quieter = menu.getByRole("checkbox", { name: "Quieter when someone talks in my room" });
  await expect(quieter).toBeChecked();
  await quieter.uncheck();
  expect((await calls(page)).at(-1)).toEqual(["quieter", false]);
  await menu.getByRole("button", { name: "Stop all" }).click();
  await expect(door(page, "Let's play")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: /^You are listening in/ })).toHaveCount(0);
  expect((await calls(page)).at(-1)).toEqual(["stop", [4]]);
});

test("a second click closes the door again; a refusal keeps it closed and says why", async ({ page }) => {
  await asDesk(page);
  await page.goto("/?fixture=sample&talking=0");
  await door(page, "Retrospective").click();
  await expect(door(page, "Retrospective")).toHaveAttribute("aria-pressed", "true");
  await door(page, "Retrospective").click();
  await expect(door(page, "Retrospective")).toHaveAttribute("aria-pressed", "false");

  await page.evaluate(() => ((window as unknown as { refuse: string }).refuse = "permission"));
  await door(page, "Ben's office").click();
  await expect(page.getByText("You may not listen in on Ben's office.")).toBeVisible();
  await expect(door(page, "Ben's office")).toHaveAttribute("aria-pressed", "false");
});

test("doors of another floor do not react; moving to another floor ends listening", async ({ page }) => {
  await asDesk(page);
  await page.goto("/?fixture=sample&talking=0");
  await door(page, "Let's play").click();
  await expect(door(page, "Let's play")).toHaveAttribute("aria-pressed", "true");

  // only looking at another floor: its doors are drawings, the listening stays
  await gotoFloor(page, /Support/);
  await expect(page.locator("button[data-door]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "You are listening in on 1 room" })).toBeVisible();

  // going there ends it
  await page.locator('[data-channel="10"]').dblclick();
  await expect(page.getByRole("button", { name: /^You are listening in/ })).toHaveCount(0);
  expect((await calls(page)).at(-1)).toEqual(["stop", [4]]);
});

test("the door works with the keyboard; changing rooms on the same floor keeps the listening", async ({ page }) => {
  await asDesk(page);
  await page.goto("/?fixture=sample&talking=0");
  await door(page, "Clara's office").focus();
  await page.keyboard.press("Enter");
  await expect(door(page, "Clara's office")).toHaveAttribute("aria-pressed", "true");
  // into another room of this floor: still listening to Clara's office
  await page.locator('[data-channel="4"]').dblclick();
  await expect(page.getByRole("button", { name: /Menu of Let's play$/ })).toBeVisible();
  await expect(door(page, "Clara's office")).toHaveAttribute("aria-pressed", "true");
  await door(page, "Clara's office").focus();
  await page.keyboard.press(" ");
  await expect(door(page, "Clara's office")).toHaveAttribute("aria-pressed", "false");
});

test("in a browser a click on the door's spot still belongs to the room: a double click enters it", async ({ page }) => {
  await page.goto("/?fixture=sample&talking=0");
  const box = (await page.locator('[data-channel="5"]').locator("..").locator(".door-spot").boundingBox())!;
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole("button", { name: /Menu of Retrospective$/ })).toBeVisible();
});

test("the volume tag shows only while hovering a room one listens to, also after listening again", async ({ page }) => {
  await asDesk(page);
  await page.goto("/?fixture=sample&talking=0");
  const tag = page.getByRole("button", { name: "Volume for Let's play" });
  const room = page.locator('[data-channel="4"]');
  for (let round = 0; round < 2; round++) {
    await door(page, "Let's play").click();
    await expect(door(page, "Let's play")).toHaveAttribute("aria-pressed", "true");
    await page.mouse.move(700, 800); // over another room
    await expect(tag).toHaveCSS("opacity", "0");
    await room.hover();
    await expect(tag).toHaveCSS("opacity", "1");
    await tag.click();
    await expect(page.getByRole("dialog", { name: "Volume for Let's play" })).toBeVisible();
    await page.getByRole("button", { name: "Stop listening to Let's play" }).last().click();
    await expect(door(page, "Let's play")).toHaveAttribute("aria-pressed", "false");
    await expect(tag).toHaveCount(0);
  }
  // nothing else of the room went with it
  await expect(page.locator('[data-channel="4"]').locator("..").locator(".plant-spot")).toHaveCount(1);
});

test("whoever listens in stands in the room as a guest, for everyone; the door stands open, their own avatar carries an ear (#21)", async ({ page }) => {
  await page.goto("/?fixture=edge-cases&talking=0");
  const clara = page.locator(".wrap-room").filter({ has: page.locator(".plate", { hasText: "Clara's office" }) });
  const eva = clara.locator(".person.guest");
  await expect(eva).toHaveCount(1);
  await expect(eva).toHaveAttribute("aria-label", /^Eva, .*listening in on Clara's office/);
  await expect(clara.locator(".person:not(.guest)")).toHaveCount(1); // Nils, the only one in the room
  await expect(clara.locator(".count")).toHaveText("1 person"); // the guest is not counted
  await expect(clara.getByTitle("Eva is listening in")).toBeVisible();
  await expect(clara.locator(".door.heard")).toHaveCount(1);
  await expect(page.locator(".wrap-room .door.heard")).toHaveCount(1); // no other door opens
  await gotoFloor(page, /Lobby/);
  await expect(page.locator('.person[data-session="3"] .ear')).toHaveAttribute("title", "Listening in on Clara's office");
});

test("going into the room one listens to pauses listening, unseen; leaving it again listens in anew (#22)", async ({ page }) => {
  await asDesk(page);
  await page.goto("/?fixture=sample&talking=0");
  await door(page, "Let's play").click();
  await expect(door(page, "Let's play")).toHaveAttribute("aria-pressed", "true");
  // inside: listening has ended, nothing hints at it
  await page.locator('[data-channel="4"]').dblclick();
  await expect(page.getByRole("button", { name: /Menu of Let's play$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^You are listening in/ })).toHaveCount(0);
  expect((await calls(page)).at(-1)).toEqual(["stop", [4]]);
  // back into the old room: listening to Let's play starts again
  await page.locator('[data-channel="3"]').dblclick();
  await expect(door(page, "Let's play")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "You are listening in on 1 room" })).toBeVisible();
  expect((await calls(page)).filter((c) => (c as unknown[])[0] === "start")).toEqual([["start", 4], ["start", 4]]);
});

test("on another floor a paused room is forgotten: it does not listen again (#22)", async ({ page }) => {
  await asDesk(page);
  await page.goto("/?fixture=sample&talking=0");
  await door(page, "Let's play").click();
  await expect(door(page, "Let's play")).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-channel="4"]').dblclick();
  await expect(page.getByRole("button", { name: /Menu of Let's play$/ })).toBeVisible();
  await gotoFloor(page, /Support/);
  await page.locator('[data-channel="10"]').dblclick();
  await expect(page.getByRole("button", { name: /Menu of Office 2$/ })).toBeVisible();
  await gotoFloor(page, /Development/);
  await page.locator('[data-channel="3"]').dblclick();
  await expect(page.getByRole("button", { name: /Menu of Let's talk$/ })).toBeVisible();
  await expect(door(page, "Let's play")).toHaveAttribute("aria-pressed", "false");
  expect((await calls(page)).filter((c) => (c as unknown[])[0] === "start")).toHaveLength(1);
});

test("Stop all also forgets a paused room (#22)", async ({ page }) => {
  await asDesk(page);
  await page.goto("/?fixture=sample&talking=0");
  for (const room of ["Let's play", "Clara's office"]) {
    await door(page, room).click();
    await expect(door(page, room)).toHaveAttribute("aria-pressed", "true");
  }
  await page.locator('[data-channel="4"]').dblclick();
  await expect(page.getByRole("button", { name: "You are listening in on 1 room" })).toBeVisible();
  await page.getByRole("button", { name: "You are listening in on 1 room" }).click();
  await page.getByRole("button", { name: "Stop all" }).click();
  await expect(page.getByRole("button", { name: /^You are listening in/ })).toHaveCount(0);
  await page.locator('[data-channel="3"]').dblclick();
  await expect(page.getByRole("button", { name: /Menu of Let's talk$/ })).toBeVisible();
  await expect(door(page, "Let's play")).toHaveAttribute("aria-pressed", "false");
  expect((await calls(page)).filter((c) => (c as unknown[])[0] === "start")).toHaveLength(2);
});

import { expect, test, type Page } from "@playwright/test";
import { gotoFloor } from "./topbar.ts";

// The room menu on the room sign (#15): tiles for the board and the room's care, and
// Ruumble's edit dialog (Ruumble Client, Mumble Write). The client's "desk" object is faked as QWebChannel hands it
// over; the fake takes over a change after a moment, unless `window.refuse` is set (the server says no).
async function asDesk(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const calls: unknown[] = [];
    const props: Record<number, { name: string; maxUsers: number; descriptionHash: string }> = {};
    const w = window as unknown as { deskCalls: unknown[]; refuse?: boolean };
    w.deskCalls = calls;
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
      channelProperties: (id: number, cb: (p: unknown) => void) => cb((props[id] ??= { name: "Let's talk", maxUsers: 4, descriptionHash: "" })),
      updateChannel: (id: number, changes: { name?: string; description?: string; maxUsers?: number }, cb: (r: unknown) => void) => {
        calls.push(changes);
        const hash = changes.description === undefined ? undefined : `hash-of-${changes.description.length}`;
        if (!w.refuse) {
          setTimeout(() => {
            const p = (props[id] ??= { name: "Let's talk", maxUsers: 4, descriptionHash: "" });
            if (changes.name !== undefined) p.name = changes.name;
            if (changes.maxUsers !== undefined) p.maxUsers = changes.maxUsers;
            if (hash !== undefined) p.descriptionHash = hash;
          }, 200);
        }
        cb({ sent: true, ...(hash === undefined ? {} : { descriptionHash: hash }) });
      },
      logged: { connect: () => {} },
      serverChanged: { connect: () => {} },
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

const roomSign = (page: Page) => page.getByRole("button", { name: /Menu of Let's talk$/ });
const roomMenu = (page: Page) => page.getByRole("group", { name: "Room menu" });

test("in a browser: the room sign opens the room menu with the room care and the board, no setup", async ({ page }) => {
  await page.goto("/?fixture=sample&talking=0");
  await roomSign(page).click();
  const menu = roomMenu(page);
  await expect(menu.getByRole("button", { name: /^Board/ })).toHaveAttribute("aria-pressed", "false");
  await expect(menu.getByRole("button", { name: "Room care" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Room setup", exact: true })).toHaveCount(0);
  // no paint bucket either, and the doors keep their old place beside the plant
  await expect(page.getByRole("button", { name: /^Room setup: / })).toHaveCount(0);
  await menu.getByRole("button", { name: /^Board/ }).click();
  await expect(menu).toHaveCount(0);
  await expect(page.locator("#board-panel")).toBeVisible();
  await page.keyboard.press("Escape");
  await roomSign(page).click();
  await page.keyboard.press("Escape");
  await expect(roomMenu(page)).toHaveCount(0);
  await expect(roomSign(page)).toBeFocused();
});

test("from another floor the room sign leads back, without a menu", async ({ page }) => {
  await page.goto("/?fixture=sample&talking=0");
  await gotoFloor(page, /Support/);
  await expect(roomSign(page)).toHaveCount(0);
  await page.getByRole("button", { name: /Go to my floor$/ }).first().click();
  await expect(roomSign(page)).toBeVisible();
});

test("without Mumble Write the setup and care tiles stay in the menu, disabled; the first enabled tile gets the focus", async ({ page }) => {
  await asDesk(page);
  await page.goto("/?fixture=edge-cases&talking=0");
  await page.getByRole("button", { name: /Menu of Anna's office$/ }).click();
  const menu = roomMenu(page);
  for (const name of ["Room setup", "Room care"]) {
    await expect(menu.getByRole("button", { name, exact: true })).toBeDisabled();
    await expect(menu.getByRole("button", { name, exact: true })).toHaveAttribute("title", "You need the Write permission in Mumble here");
  }
  await expect(menu.getByRole("button", { name: /^Board/ })).toBeFocused();
  await expect(page.getByRole("button", { name: /^Room setup: / })).toHaveCount(0); // no paint bucket in the room
});

test.describe("inside Ruumble Client", () => {
  test.beforeEach(async ({ page }) => {
    await asDesk(page);
    await page.goto("/?fixture=sample&talking=0");
  });

  test("Room setup: name, Markdown description and maximum users go to Mumble as plain text, the dialog closes once taken over", async ({ page }) => {
    await roomSign(page).click();
    await roomMenu(page).getByRole("button", { name: "Room setup", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Room setup" });
    await expect(dialog.getByLabel("Available seats")).toHaveValue("4");
    await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled(); // nothing changed yet
    await dialog.getByLabel("Room name").fill("Ben's office");
    await expect(dialog.getByRole("alert")).toHaveText("This name is already used here.");
    await dialog.getByLabel("Room name").fill("Retro corner");
    await dialog.getByRole("textbox", { name: "Description" }).fill("# Retro\n\n- every **Friday**");
    await dialog.getByRole("tab", { name: "Preview" }).click();
    await expect(dialog.getByRole("heading", { name: "Retro" })).toBeVisible();
    await expect(dialog.locator("strong", { hasText: "Friday" })).toBeVisible();
    await dialog.getByLabel("Available seats").fill("6");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { deskCalls: unknown[] }).deskCalls)).toEqual([
      { name: "Retro corner", description: "# Retro\n\n- every **Friday**", maxUsers: 6 },
    ]);
  });

  test("the paint bucket beside the plant opens the room setup of that room; every door of the floor moves right by the same", async ({ page }) => {
    const rooms = page.locator(".wrap-room");
    const offsets: number[] = [];
    for (let i = 0; i < (await rooms.count()); i++) {
      const wrap = (await rooms.nth(i).boundingBox())!;
      const door = (await rooms.nth(i).locator(".door-spot").boundingBox())!;
      offsets.push(Math.round(door.x - wrap.x));
    }
    expect(new Set(offsets)).toEqual(new Set([70]));
    await page.getByRole("button", { name: "Room setup: Let's talk" }).click();
    const dialog = page.getByRole("dialog", { name: "Room setup" });
    await expect(dialog.getByLabel("Room name")).toHaveValue("Let's talk");
  });

  test("Room setup: a change Mumble does not take over is reported, the dialog stays", async ({ page }) => {
    await page.evaluate(() => ((window as unknown as { refuse: boolean }).refuse = true));
    await roomSign(page).click();
    await roomMenu(page).getByRole("button", { name: "Room setup", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Room setup" });
    await dialog.getByLabel("Room name").fill("Retro corner");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByRole("alert")).toHaveText(/Mumble did not take over the change/, { timeout: 10_000 });
    await expect(dialog).toBeVisible();
  });
});

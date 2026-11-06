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

test("in a browser: the room sign opens the room menu with the board and the room care, no edit", async ({ page }) => {
  await page.goto("/?fixture=sample&talking=0");
  await roomSign(page).click();
  const menu = roomMenu(page);
  await expect(menu.getByRole("button", { name: /^Board/ })).toHaveAttribute("aria-pressed", "false");
  await expect(menu.getByRole("button", { name: "Room care" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Set up room …" })).toHaveCount(0);
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

test.describe("inside Ruumble Client", () => {
  test.beforeEach(async ({ page }) => {
    await asDesk(page);
    await page.goto("/?fixture=sample&talking=0");
  });

  test("Set up room: name, Markdown description and maximum users go to Mumble as plain text, the dialog closes once taken over", async ({ page }) => {
    await roomSign(page).click();
    await roomMenu(page).getByRole("button", { name: "Set up room …" }).click();
    const dialog = page.getByRole("dialog", { name: "Set up room: Let's talk" });
    await expect(dialog.getByLabel("Maximum number of people")).toHaveValue("4");
    await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled(); // nothing changed yet
    await dialog.getByLabel("Name").fill("Ben's office");
    await expect(dialog.getByRole("alert")).toHaveText("This name is already used here.");
    await dialog.getByLabel("Name").fill("Retro corner");
    await dialog.getByRole("textbox", { name: "Description" }).fill("# Retro\n\n- every **Friday**");
    await dialog.getByRole("tab", { name: "Preview" }).click();
    await expect(dialog.getByRole("heading", { name: "Retro" })).toBeVisible();
    await expect(dialog.locator("strong", { hasText: "Friday" })).toBeVisible();
    await dialog.getByLabel("Maximum number of people").fill("6");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { deskCalls: unknown[] }).deskCalls)).toEqual([
      { name: "Retro corner", description: "<!-- ruumble:markdown -->\n# Retro\n\n- every **Friday**", maxUsers: 6 },
    ]);
  });

  test("Set up room: a change Mumble does not take over is reported, the dialog stays", async ({ page }) => {
    await page.evaluate(() => ((window as unknown as { refuse: boolean }).refuse = true));
    await roomSign(page).click();
    await roomMenu(page).getByRole("button", { name: "Set up room …" }).click();
    const dialog = page.getByRole("dialog", { name: "Set up room: Let's talk" });
    await dialog.getByLabel("Name").fill("Retro corner");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByRole("alert")).toHaveText(/Mumble did not take over the change/, { timeout: 10_000 });
    await expect(dialog).toBeVisible();
  });
});

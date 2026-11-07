import { expect, test, type Page } from "@playwright/test";
import { userMenu } from "./topbar.ts";

// "A newer Ruumble Client is out" (#18): the client reports its version on the desk (faked as QWebChannel hands it
// over), the service the latest release (the mock: ?clientRelease=).
async function asClient(page: Page, clientVersion: string | undefined): Promise<void> {
  await page.addInitScript((clientVersion) => {
    const desk = {
      version: "1.6.0", server: "127.0.0.1:64738", ...(clientVersion === undefined ? {} : { clientVersion }),
      history: (cb: (e: unknown[]) => void) => cb([]), sendMessage: (_t: string, cb: (ok: boolean) => void) => cb(true),
      openSettings() {}, openConnect() {}, openAudioWizard() {}, disconnectServer() {}, showMenu() {},
      logged: { connect() {} }, serverChanged: { connect() {} },
    };
    Object.assign(window, { qt: { webChannelTransport: {} }, QWebChannel: class { constructor(_t: unknown, ready: (c: { objects: { desk: typeof desk } }) => void) { ready({ objects: { desk } }); } } });
  }, clientVersion);
}

const badge = (page: Page) => page.getByRole("button", { name: /^User menu/ });

test("an older client: a dot on the name badge, the menu entry opens the release; the dot goes once seen", async ({ page }) => {
  await asClient(page, "0.38.0");
  await page.goto("/?fixture=sample&talking=0&clientRelease=0.39.0");
  await expect(badge(page)).toHaveAccessibleName("User menu, A new version of Ruumble Client is out");
  const entry = (await userMenu(page)).getByRole("link", { name: "Ruumble Client 0.39.0 is out" });
  await expect(entry).toHaveAttribute("href", "https://github.com/ruumble-project/ruumble-client/releases/tag/v0.39.0");
  await expect(entry).toHaveAttribute("title", "You use 0.38.0. Opens the download page.");
  await page.keyboard.press("Escape");
  await expect(badge(page)).toHaveAccessibleName("User menu");
  await page.reload();
  await expect(badge(page)).toHaveAccessibleName("User menu"); // remembered
  await expect((await userMenu(page)).getByRole("link", { name: "Ruumble Client 0.39.0 is out" })).toBeVisible(); // still offered
});

for (const [why, version, release] of [
  ["up to date", "0.39.0", "0.39.0"],
  ["a development build", "0.40.0", "0.39.0"],
  ["an older client without its version", undefined, "0.39.0"],
  ["the service knows no release", "0.38.0", ""],
] as const) {
  test(`nothing when ${why}`, async ({ page }) => {
    await asClient(page, version);
    await page.goto(`/?fixture=sample&talking=0${release ? `&clientRelease=${release}` : ""}`);
    await expect(badge(page)).toHaveAccessibleName("User menu");
    await expect((await userMenu(page)).getByRole("link", { name: /is out$/ })).toHaveCount(0);
  });
}

test("nothing in a browser", async ({ page }) => {
  await page.goto("/?fixture=sample&talking=0&clientRelease=0.39.0");
  await expect(badge(page)).toHaveAccessibleName("User menu");
  await expect((await userMenu(page)).getByRole("link", { name: /is out$/ })).toHaveCount(0);
});

test("the foot of the user menu names Ruumble's server and, inside Ruumble Client, its version; no Mumble version", async ({ page }) => {
  await asClient(page, "0.40.0");
  await page.goto("/?fixture=sample&talking=0");
  const menu = await userMenu(page);
  await expect(menu.locator(".versions")).toHaveText(/^Ruumble server \d+\.\d+\.\d+\s*Ruumble Client 0\.40\.0$/);
  await expect(menu.getByText(/^Mumble /)).toHaveCount(0);
});

test("in a browser only the server's version", async ({ page }) => {
  await page.goto("/?fixture=sample&talking=0");
  await expect((await userMenu(page)).locator(".versions")).toHaveText(/^Ruumble server \d+\.\d+\.\d+\s*$/);
});

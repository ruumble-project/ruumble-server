import { expect, test, type Page } from "@playwright/test";

// Inside Ruumble Desk (ADR-0024) the plugin is built in: the notice screens show no plugin download or install steps.
// The client's "desk" object is faked the way QWebChannel hands it over.
async function asDesk(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as unknown as { deskCalls: string[] }).deskCalls = calls;
    const desk = {
      version: "1.6.0",
      server: "127.0.0.1:64738",
      history: (cb: (entries: unknown[]) => void) => cb([]),
      sendMessage: (_text: string, cb: (ok: boolean) => void) => cb(true),
      openSettings: () => calls.push("settings"),
      openConnect: () => calls.push("connect"),
      openAudioWizard: () => calls.push("audio"),
      disconnectServer: () => calls.push("disconnect"),
      showMenu: () => calls.push("menu"),
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

test("Ruumble Desk, not paired: pairs itself, no plugin download", async ({ page }) => {
  await asDesk(page);
  await page.goto("/?fixture=sample&paired=0&talking=0");
  await expect(page.getByText("This device is not paired yet.")).toBeVisible();
  await expect(page.getByText("Ruumble Desk pairs itself the next time it connects to the server.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pair this browser" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download the Ruumble plugin" })).toHaveCount(0);
});

test("Ruumble Desk, Mumble offline: a button opens the client's connect dialog instead of the plugin help", async ({ page }) => {
  await asDesk(page);
  await page.goto("/?fixture=sample&talking=0&debug");
  await page.getByRole("button", { name: "Disconnect plugin" }).click();
  await expect(page.getByText("Connect Ruumble Desk to the server", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download the Ruumble plugin" })).toHaveCount(0);
  await page.getByRole("button", { name: "Connect to a server" }).click();
  expect(await page.evaluate(() => (window as unknown as { deskCalls: string[] }).deskCalls)).toEqual(["connect"]);
});

test("in a normal browser the plugin help stays", async ({ page }) => {
  await page.goto("/?fixture=sample&paired=0&talking=0");
  await expect(page.getByRole("link", { name: "Download the Ruumble plugin" })).toBeVisible();
});

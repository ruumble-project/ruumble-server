import { expect, test, type Locator, type Page } from "@playwright/test";
import { elevator } from "./topbar.ts";

// Inside Ruumble Client (ADR-0024) the plugin is built in: the notice screens show no plugin download or install steps.
// The client's "desk" object is faked the way QWebChannel hands it over.
async function asDesk(page: Page, history: unknown[] = []): Promise<void> {
  await page.addInitScript((history) => {
    const calls: string[] = [];
    (window as unknown as { deskCalls: string[] }).deskCalls = calls;
    const desk = {
      version: "1.6.0",
      server: "127.0.0.1:64738",
      history: (cb: (entries: unknown[]) => void) => cb(history),
      sendMessage: (_text: string, cb: (ok: boolean) => void) => cb(true),
      openSettings: () => calls.push("settings"),
      openConnect: () => calls.push("connect"),
      openAudioWizard: () => calls.push("audio"),
      disconnectServer: () => calls.push("disconnect"),
      showMenu: () => calls.push("menu"),
      logged: { connect: (h: (e: unknown) => void) => ((window as unknown as { deskLog: typeof h }).deskLog = h) },
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
  }, history);
}

/** the accessible names of buttons: aria-label, else their text */
const namesOf = (buttons: Locator) => buttons.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? e.textContent?.trim() ?? ""));

const deskCalls = (page: Page) => page.evaluate(() => (window as unknown as { deskCalls: string[] }).deskCalls);

test("Ruumble Client, not paired: pairs itself, no plugin download", async ({ page }) => {
  await asDesk(page);
  await page.goto("/?fixture=sample&paired=0&talking=0");
  await expect(page.getByText("This device is not paired yet.")).toBeVisible();
  await expect(page.getByText("Ruumble Client pairs itself the next time it connects to the server.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pair this browser" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download the Ruumble plugin" })).toHaveCount(0);
});

test("Ruumble Client, Mumble offline: a button opens the client's connect dialog instead of the plugin help", async ({ page }) => {
  await asDesk(page);
  await page.goto("/?fixture=sample&talking=0&debug");
  await page.getByRole("button", { name: "Disconnect plugin" }).click();
  await expect(page.getByText("Connect Ruumble Client to the server", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download the Ruumble plugin" })).toHaveCount(0);
  await page.getByRole("button", { name: "Connect to a server" }).click();
  expect(await page.evaluate(() => (window as unknown as { deskCalls: string[] }).deskCalls)).toEqual(["connect"]);
});

test("in a normal browser the plugin help stays", async ({ page }) => {
  await page.goto("/?fixture=sample&paired=0&talking=0");
  await expect(page.getByRole("link", { name: "Download the Ruumble plugin" })).toBeVisible();
});

const LOG = [
  { id: 1, time: Date.UTC(2026, 10, 5, 8, 0), kind: "info", text: "Welcome to Acme" },
  { id: 2, time: Date.UTC(2026, 10, 5, 8, 1), kind: "own", text: "Me: anyone here?" },
  { id: 3, time: Date.UTC(2026, 10, 5, 8, 2), kind: "text", text: "Ben: Coffee in the kitchen" },
  { id: 4, time: Date.UTC(2026, 10, 5, 8, 3), kind: "info", text: "Clara entered the channel" },
  { id: 5, time: Date.UTC(2026, 10, 5, 8, 4), kind: "text", text: "Clara: build is green" },
];

test.describe("Ruumble in a box", () => {
  test.beforeEach(async ({ page }) => {
    await asDesk(page, LOG);
    await page.goto("/?fixture=sample&talking=0");
  });

  test("the button sits next to the floor sign, counts unread messages and opens the box with a New line", async ({ page }) => {
    const button = page.getByRole("button", { name: "Ruumble in a box: log and chat, 2 new messages" });
    await expect(button).toBeVisible();
    const sign = (await page.getByRole("button", { name: /choose floor$/ }).boundingBox())!;
    const box = (await button.boundingBox())!;
    expect(box.x).toBeGreaterThan(sign.x + sign.width);
    expect(box.x - (sign.x + sign.width)).toBeLessThan(20);
    await button.click();
    const panel = page.getByRole("region", { name: "Ruumble in a box" });
    await expect(panel.getByRole("heading", { name: "Ruumble in a box" })).toBeVisible();
    await expect(panel.getByRole("tab")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ruumble in a box: log and chat" })).toHaveAttribute("aria-pressed", "true");
    // the line stands right above Ben's message, the first unread one
    const line = panel.getByRole("separator", { name: "New" });
    await expect(line).toBeVisible();
    const lineY = (await line.boundingBox())!.y;
    expect((await panel.getByText("Ben: Coffee in the kitchen").boundingBox())!.y).toBeGreaterThan(lineY);
    expect((await panel.getByText("Me: anyone here?").boundingBox())!.y).toBeLessThan(lineY);
    // closed and opened again without anything unread: no line
    await panel.getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Ruumble in a box: log and chat" }).click();
    await expect(panel.getByRole("separator", { name: "New" })).toHaveCount(0);
  });

  test("search and filter work together, the filter is remembered", async ({ page }) => {
    await page.getByRole("button", { name: /^Ruumble in a box/ }).click();
    const panel = page.getByRole("region", { name: "Ruumble in a box" });
    const log = panel.getByRole("log");
    const search = panel.getByRole("searchbox", { name: "Search the log" });
    await search.fill("CLARA");
    await expect(log.locator(".entry")).toHaveText([/Clara entered the channel/, /Clara: build is green/]);
    await panel.getByRole("combobox", { name: "Show" }).selectOption("messages");
    await expect(log.locator(".entry")).toHaveText([/Clara: build is green/]);
    await search.fill("nobody");
    await expect(log.getByText("Nothing found.")).toBeVisible();
    await search.press("Escape"); // clears the search first
    await expect(search).toHaveValue("");
    await expect(log.locator(".entry")).toHaveCount(3);
    await panel.getByRole("combobox", { name: "Show" }).selectOption("notices");
    await expect(log.locator(".entry")).toHaveText([/Welcome to Acme/, /Clara entered the channel/]);
    // a new entry while searching: shown when it matches
    await search.fill("dave");
    await page.evaluate(() => (window as unknown as { deskLog: (e: unknown) => void }).deskLog({ id: 6, time: Date.now(), kind: "info", text: "Dave entered the channel" }));
    await expect(log.locator(".entry")).toHaveText([/Dave entered the channel/]);

    await page.reload();
    await page.getByRole("button", { name: /^Ruumble in a box/ }).click();
    await expect(panel.getByRole("combobox", { name: "Show" })).toHaveValue("notices");
    await expect(panel.getByRole("searchbox", { name: "Search the log" })).toHaveValue("");
  });

  test("the box keeps clear of the own room: at the bottom left, at the top left when the room is in the bottom row", async ({ page }) => {
    await page.getByRole("button", { name: /^Ruumble in a box/ }).click();
    const box = page.getByRole("region", { name: "Ruumble in a box" });
    const plan = (await page.locator(".floorplan").boundingBox())!;
    // Anna is in "Let's talk", in the top row: the box stays at the bottom
    await expect.poll(async () => (await box.boundingBox())!.y).toBeGreaterThan(plan.y + plan.height / 3);
    await page.locator(".floorplan").getByRole("button", { name: /^Ben's office/ }).dblclick();
    await expect(page.getByRole("status", { name: /^You are here: Ben's office/ })).toBeVisible();
    // now in the bottom row: the box moves to the top, below the top bar
    await expect.poll(async () => (await box.boundingBox())!.y).toBeLessThan(plan.y + 20);
    await expect.poll(async () => (await box.boundingBox())!.y).toBeGreaterThanOrEqual(plan.y - 2); // after its animation
  });

  test("the chat input sends to the own room", async ({ page }) => {
    await page.getByRole("button", { name: /^Ruumble in a box/ }).click();
    const input = page.getByRole("textbox", { name: "Message to Let's talk" });
    await expect(input).toBeFocused();
    await input.fill("Hello room");
    await input.press("Enter");
    await expect(input).toHaveValue("");
  });

  test("the elevator: online count in the head, Mumble's functions in the footer", async ({ page }) => {
    const lift = await elevator(page);
    await expect(lift.getByRole("button", { name: "8 online" })).toBeVisible();
    const footer = lift.locator("footer");
    const buttons = footer.getByRole("button");
    expect(await namesOf(buttons)).toEqual(["City Map", "Configuration", "Room acoustics assistant", "All Mumble functions", "Leave"]);
    await expect(footer.getByRole("group", { name: "Mumble" }).getByRole("button")).toHaveCount(3);
    // City Map at the left edge, Leave at the right edge
    const f = (await footer.boundingBox())!;
    const first = (await buttons.first().boundingBox())!;
    const last = (await buttons.last().boundingBox())!;
    expect(first.x - f.x).toBeLessThan(16);
    expect(f.x + f.width - (last.x + last.width)).toBeLessThan(16);

    // each one closes the elevator and calls the client
    const names = ["City Map", "Configuration", "Room acoustics assistant", "All Mumble functions", "Leave"];
    for (const name of names) await (await elevator(page)).getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Elevator – floors" })).toHaveCount(0);
    expect(await deskCalls(page)).toEqual(["connect", "settings", "audio", "menu", "disconnect"]);
  });

  test("the online count opens the building overview", async ({ page }) => {
    await (await elevator(page)).getByRole("button", { name: "8 online" }).click();
    await expect(page.getByRole("dialog", { name: "Building overview" })).toBeVisible();
  });

  test("in German", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("ruumble.locale", "de"));
    await page.reload();
    await expect(page.getByRole("button", { name: "Ruumble in a box: Protokoll und Chat, 2 neue Nachrichten" })).toBeVisible();
    const lift = await elevator(page);
    expect(await namesOf(lift.locator("footer").getByRole("button"))).toEqual(
      ["Stadtplan", "Konfiguration", "Assistent für Raumakustik", "Alle Mumble-Funktionen", "Verlassen"],
    );
    // the footer fits without a horizontal scrollbar, with room for a classic vertical one (Qt WebEngine)
    const fit = await lift.evaluate((el) => {
      const f = el.querySelector("footer")!;
      const style = getComputedStyle(f);
      const need = [...f.children].reduce((s, c) => s + (c as HTMLElement).offsetWidth, 0)
        + 2 * parseFloat(style.columnGap) + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      return { scroll: el.scrollWidth, client: el.clientWidth, need };
    });
    expect(fit.scroll).toBeLessThanOrEqual(fit.client);
    expect(fit.need + 15).toBeLessThanOrEqual(fit.client);
  });
});

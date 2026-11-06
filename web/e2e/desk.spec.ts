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

  test("one button at the top right counts everything unread; the room tab comes first, as an icon, with a New line", async ({ page }) => {
    const button = page.getByRole("button", { name: "Ruumble in a box, 2 unread messages" });
    await expect(button).toBeVisible();
    // where the quiet word's button was: right of tube mail; nothing next to the floor sign any more
    const tube = (await page.getByRole("button", { name: "Tube mail" }).boundingBox())!;
    expect((await button.boundingBox())!.x).toBeGreaterThan(tube.x);
    await expect(page.locator("header .left").getByRole("button", { name: /Ruumble in a box/ })).toHaveCount(0);
    await button.click();
    const panel = page.getByRole("region", { name: "Ruumble in a box" });
    await expect(panel.getByRole("heading", { name: "Ruumble in a box" })).toBeVisible();
    const room = panel.getByRole("tab", { name: "Log and chat of Let's talk" });
    await expect(room).toHaveAttribute("aria-selected", "true");
    await expect(room).toHaveText(""); // only an icon; the name is in the tooltip
    await expect(room).toHaveAttribute("title", "Log and chat of Let's talk");
    await expect(page.getByRole("button", { name: "Ruumble in a box", exact: true })).toHaveAttribute("aria-pressed", "true");
    // the line stands right above Ben's message, the first unread one (checked in the document order in one step:
    // pixel positions move while the box slides in and the log scrolls to the line)
    const line = panel.getByRole("separator", { name: "New" });
    await expect(line).toBeVisible();
    expect(await line.evaluate((el) => [el.previousElementSibling?.textContent ?? "", el.nextElementSibling?.textContent ?? ""])).toEqual([
      expect.stringContaining("Me: anyone here?"), expect.stringContaining("Ben: Coffee in the kitchen"),
    ]);
    // closed and opened again without anything unread: no line
    await panel.getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Ruumble in a box", exact: true }).click();
    await expect(panel.getByRole("separator", { name: "New" })).toHaveCount(0);
  });

  test("the quiet words live in the same box: a tab per person after the room", async ({ page }) => {
    await page.locator(".floorplan").getByRole("img", { name: /^Clara/ }).hover();
    await page.getByRole("group", { name: "Clara" }).getByRole("button", { name: "Message to Clara" }).click();
    const panel = page.getByRole("region", { name: "Ruumble in a box" });
    const tabs = panel.getByRole("tab");
    await expect(tabs).toHaveCount(2);
    await expect(tabs.first()).toHaveAccessibleName("Log and chat of Let's talk, 2 unread messages");
    await expect(panel.getByRole("tab", { name: "Clara" })).toHaveAttribute("aria-selected", "true");
    await tabs.first().click();
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await expect(panel.getByRole("log")).toBeVisible();
    await panel.getByRole("tab", { name: "Clara" }).click();
    await expect(panel.getByRole("tab", { name: "Clara" })).toHaveAttribute("aria-selected", "true");
    // closing the last person goes back to the room; the box stays open
    await panel.getByRole("button", { name: "Close the conversation with Clara" }).click();
    await expect(tabs).toHaveCount(1);
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  });

  test("search and filter work together, the filter is remembered", async ({ page }) => {
    await page.getByRole("button", { name: /^Ruumble in a box/ }).click();
    const panel = page.getByRole("region", { name: "Ruumble in a box" });
    const log = panel.getByRole("log");
    const search = panel.getByRole("searchbox", { name: "Search the log" });
    await search.fill("CLARA");
    await expect(log.locator(".entry")).toHaveText([/Clara entered the channel/, /Clara: build is green/]);
    // the filter is a menu, as on the board
    const pick = async (name: string) => { await panel.getByRole("button", { name: "Show" }).click(); await panel.getByRole("menuitemradio", { name }).click(); };
    await pick("Messages");
    await expect(log.locator(".entry")).toHaveText([/Clara: build is green/]);
    await search.fill("nobody");
    await expect(log.getByText("Nothing found.")).toBeVisible();
    await search.press("Escape"); // clears the search first
    await expect(search).toHaveValue("");
    await expect(log.locator(".entry")).toHaveCount(3);
    await pick("Notices");
    await expect(log.locator(".entry")).toHaveText([/Welcome to Acme/, /Clara entered the channel/]);
    // a new entry while searching: shown when it matches
    await search.fill("dave");
    await page.evaluate(() => (window as unknown as { deskLog: (e: unknown) => void }).deskLog({ id: 6, time: Date.now(), kind: "info", text: "Dave entered the channel" }));
    await expect(log.locator(".entry")).toHaveText([/Dave entered the channel/]);

    await page.reload();
    await page.getByRole("button", { name: /^Ruumble in a box/ }).click();
    await panel.getByRole("button", { name: "Show" }).click();
    await expect(panel.getByRole("menuitemradio", { name: "Notices" })).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape"); // closes only the menu
    await expect(panel.getByRole("menu")).toHaveCount(0);
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("searchbox", { name: "Search the log" })).toHaveValue("");
  });

  test("the box keeps clear of the own room and the floating board", async ({ page }) => {
    await page.getByRole("button", { name: /^Ruumble in a box/ }).click();
    const box = page.getByRole("region", { name: "Ruumble in a box" });
    const plan = (await page.locator(".floorplan").boundingBox())!;
    // Anna is in "Let's talk", in the top row: the box stays at the bottom
    await expect.poll(async () => { const b = (await box.boundingBox())!; return b.y + b.height; }).toBeGreaterThan(plan.y + plan.height - 20);
    await page.locator(".floorplan").getByRole("button", { name: /^Ben's office/ }).dblclick();
    await expect(page.getByRole("button", { name: /^You are here: Ben's office/ })).toBeVisible();
    // now in the bottom row: the box moves to the top, below the top bar
    await expect.poll(async () => (await box.boundingBox())!.y).toBeLessThan(plan.y + 20);
    await expect.poll(async () => (await box.boundingBox())!.y).toBeGreaterThanOrEqual(plan.y - 10); // 5 px past the wall, after its animation
    expect((await box.boundingBox())!.x).toBeLessThan(plan.x + 20);
    // own room at the bottom right, floating board on the left: the box goes to the top right
    await page.getByRole("button", { name: "Show board" }).click();
    const boardPanel = page.getByRole("complementary", { name: "Board" });
    await boardPanel.getByRole("button", { name: "View" }).click();
    await boardPanel.getByRole("menuitemradio", { name: "Floating" }).click();
    await page.keyboard.press("Escape");
    await page.locator(".floorplan").getByRole("button", { name: /^Clara's office/ }).dispatchEvent("dblclick");
    await expect(boardPanel).toHaveClass(/left/);
    if (!(await box.isVisible())) await page.getByRole("button", { name: "Ruumble in a box", exact: true }).click();
    await expect.poll(async () => { const b = (await box.boundingBox())!; return b.x + b.width; }).toBeGreaterThan(plan.x + plan.width - 20);
    await expect.poll(async () => (await box.boundingBox())!.y).toBeLessThan(plan.y + 20);
    // the board hidden: the box stays where it is, on the other side of where the board would be
    await boardPanel.getByRole("button", { name: "Hide board" }).click();
    await expect(boardPanel).toHaveCount(0);
    await expect(box).toHaveClass(/right/);
  });

  test("the box covers the other row and the corridor, stops short of the own row and floats 5 px past the plan's wall", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: /^Ruumble in a box/ }).click();
    const box = page.getByRole("region", { name: "Ruumble in a box" });
    const rect = (sel: string) => page.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
    const edges = async () => { const b = (await box.boundingBox())!; return { top: b.y, bottom: b.y + b.height }; };
    // 5 px past the floor plan's outer wall (its outer edge: 32 px from the left, 24 px from the bottom)
    const outer = (await box.boundingBox())!;
    expect(outer.x).toBeCloseTo(27, 0);
    await expect.poll(async () => Math.round(page.viewportSize()!.height - (await edges()).bottom)).toBe(19);
    // in "Let's talk" (top row): from the bottom up to 16 px short of the corridor's top, never into the own row
    const corridor = await rect(".floorplan .wrap-corridor");
    await expect.poll(async () => Math.abs((await edges()).top - (corridor.top + 16))).toBeLessThan(3);
    // in "Ben's office" (bottom row): from the top down to the corridor's bottom
    await page.locator(".floorplan").getByRole("button", { name: /^Ben's office/ }).dblclick();
    await expect(page.getByRole("button", { name: /^You are here: Ben's office/ })).toBeVisible();
    await expect.poll(async () => Math.abs((await edges()).bottom - (corridor.bottom - 16))).toBeLessThan(3);
    // in the corridor: only the bottom row
    await page.locator(".floorplan .room.corridor").dblclick({ position: { x: 600, y: 30 } });
    await expect(page.getByRole("button", { name: /^You are here: Corridor/ })).toBeVisible();
    const bottomRow = await rect(".floorplan .row.bottom");
    await expect.poll(async () => Math.abs((await edges()).top - (bottomRow.top + 16))).toBeLessThan(3);
  });

  test("the chat input sends to the own room", async ({ page }) => {
    await page.getByRole("button", { name: /^Ruumble in a box/ }).click();
    const input = page.getByRole("textbox", { name: "Message in Let's talk" });
    await expect(page.getByRole("tab", { name: "Log and chat of Let's talk" })).toBeFocused(); // as with P: ready for , and .
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
    await page.getByRole("button", { name: "Ruumble in a box, 2 ungelesene Nachrichten" }).click();
    await expect(page.getByRole("tab", { name: "Protokoll und Chat von Let's talk" })).toHaveAttribute("aria-selected", "true");
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

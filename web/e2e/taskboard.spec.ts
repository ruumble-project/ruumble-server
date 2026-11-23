import { expect, test, type Page } from "@playwright/test";

// The task board (#29) against the mock: Anna is in "Let's talk" with Clara (Ruumble) and David (Mumble only); Ben
// (Ruumble) is in his office. "Let's talk" has a board on which Ben helps Clara, Ben's office one with Ben's open
// request (+1 by David), the empty "Retrospective" one with Eva's request from yesterday, the corridor an empty one.
test.describe("Task board", () => {
  test.beforeEach(async ({ page }) => page.goto("/?fixture=sample&talking=0"));

  const board = (page: Page, room: string) => page.getByRole("button", { name: new RegExp(`^Open the task board of ${room} · `) });
  const panel = (page: Page) => page.locator("#taskboard-panel");
  const person = (page: Page, name: string) => page.locator(".floorplan").getByRole("img", { name: new RegExp(`^${name}`) });
  const plaque = (page: Page, room: string) => page.locator(`.wrap:has([data-channel="${room}"]) .plaque`);

  test("in the floor plan: every room with a board shows it, with the flag and its count, for everyone who may enter", async ({ page }) => {
    await expect(board(page, "Ben's office")).toHaveAccessibleName(/1 request waiting, the oldest 25 min ago$/);
    await expect(board(page, "Retrospective")).toHaveAccessibleName(/1 request waiting, the oldest 20 \S+ ago$/);
    await expect(board(page, "Let's talk")).toHaveAccessibleName(/No open request$/);
    await expect(board(page, "Let's play")).toHaveCount(0);
    // the flag: waving where a request has waited longer than the room's time (30 minutes by default)
    await expect(board(page, "Retrospective").locator("svg.waving")).toHaveCount(1);
    await expect(board(page, "Ben's office").locator("svg.waving")).toHaveCount(0);
    // the flag is red while a request is new (Ben's: 25 minutes), green after 2 hours (Eva's: yesterday); no number
    await expect(board(page, "Ben's office").locator(".flag.fresh")).toHaveCount(1);
    await expect(board(page, "Retrospective").locator(".flag:not(.fresh)")).toHaveCount(1);
    await expect(board(page, "Ben's office").locator("text")).toHaveCount(0);
    // the marks at the people: Ben asks for help in his office (and helps Clara: asking wins)
    await expect(person(page, "Ben")).toHaveAccessibleName(/asks for help/);
    await expect(person(page, "Clara")).not.toHaveAccessibleName(/asks for help/);
  });

  test("door plate, task board and binders stand on one baseline, the cork board hangs centred on the task board's board", async ({ page }) => {
    const room = page.locator('.wrap:has([data-channel="3"])');
    const bottom = async (selector: string) => {
      const box = (await room.locator(selector).first().boundingBox())!;
      return Math.round(box.y + box.height);
    };
    const plate = await bottom(".plate");
    for (const s of [".taskboard-spot svg", ".binders-toggle svg"]) expect(Math.abs((await bottom(s)) - plate), s).toBeLessThanOrEqual(2);
    // the cork board hangs on the wall, centred on the task board's board: the same overhang above and below
    const middle = async (selector: string) => {
      const box = (await room.locator(selector).first().boundingBox())!;
      return box.y + box.height / 2;
    };
    expect(Math.abs((await middle(".notes.toggle svg")) - (await middle(".taskboard-spot rect.surface")))).toBeLessThanOrEqual(1.5);
    // 16 px between the cork board and the task board's board
    const cork = (await room.locator(".notes.toggle svg").boundingBox())!;
    const board = (await room.locator(".taskboard-spot rect.surface").boundingBox())!;
    expect(Math.round(board.x - (cork.x + cork.width))).toBeGreaterThanOrEqual(15);
  });

  test("another room's board: help from anywhere, asking only inside", async ({ page }) => {
    await board(page, "Ben's office").click();
    await expect(panel(page).getByRole("heading", { name: "Task board of Ben's office" })).toBeVisible();
    await expect(panel(page)).toContainText("Whoever is in Ben's office can ask for help here. You can help from anywhere.");
    await expect(panel(page).getByRole("combobox")).toHaveCount(0);
    const card = panel(page).getByRole("article", { name: "Can someone look at my failing build?" });
    await expect(card).toContainText("Ben and David");
    await expect(card).toContainText("until 16:00");
    await card.getByRole("button", { name: "I'll help" }).click();
    await expect(panel(page).getByRole("heading", { name: /Being helped · 1/ })).toBeVisible();
    await expect(card).toContainText("Anna is helping Ben");
    await expect(card.getByRole("button", { name: "Go to Ben" })).toBeVisible();
    await expect(plaque(page, "6")).toHaveText("Anna is helping Ben");
    await expect(person(page, "Anna")).toHaveAccessibleName(/is helping/);
    await card.getByRole("button", { name: "Done" }).click();
    await expect(card).toContainText("Anna helped Ben");
    await expect(card.getByRole("button", { name: "Reopen" })).toBeVisible();
    // the board's graphic is the toggle: a second click closes the sidebar
    await board(page, "Ben's office").click();
    await expect(panel(page)).toHaveCount(0);
  });

  test("ask in the own room with a chip and @, then solve it; the plaque and the mark come and go", async ({ page }) => {
    await board(page, "Let's talk").click();
    const field = panel(page).getByRole("combobox", { name: "What do you need help with?" });
    await field.fill("The printer is jammed @Gre");
    await expect(panel(page).getByRole("option", { name: "Gregor" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(field).toHaveValue("The printer is jammed");
    await expect(panel(page).getByRole("button", { name: "to Gregor" })).toBeVisible();
    await panel(page).getByRole("form", { name: "Ask" }).getByText("quick call").click();
    await panel(page).getByRole("button", { name: "Ask", exact: true }).click();
    const card = panel(page).getByRole("article", { name: "The printer is jammed" });
    await expect(card).toContainText("to Gregor");
    await expect(card).toContainText("quick call");
    await expect(plaque(page, "3")).toHaveText("Anna asks Gregor: The printer is jammed");
    await expect(person(page, "Anna")).toHaveAccessibleName(/asks for help/);
    await expect(board(page, "Let's talk")).toHaveAccessibleName(/1 request waiting/);
    await expect(card.getByRole("button", { name: "I'll help" })).toHaveCount(0); // not one's own
    await card.getByRole("button", { name: "Solved it" }).click();
    await expect(card).toContainText("Anna solved it");
    await expect(person(page, "Anna")).not.toHaveAccessibleName(/asks for help/);
  });

  test("someone else asks: the plaque on the room opens its board; +1 on a request being helped", async ({ page }) => {
    await page.evaluate(() => (window as unknown as { ruumbleMock: { askForHelp(): void } }).ruumbleMock.askForHelp());
    await plaque(page, "3").click();
    await expect(panel(page).getByRole("heading", { name: "Task board of Let's talk" })).toBeVisible();
    await expect(panel(page).getByRole("article", { name: "Printer on the 2nd floor is jammed again" })).toBeVisible();
    // Ben helps Clara already: no second helper, but "me too"
    const clara = panel(page).getByRole("article", { name: "VPN certificate expired, how do I renew it?" });
    await expect(clara.getByRole("button", { name: "I'll help" })).toHaveCount(0);
    await clara.getByRole("button", { name: "+1" }).click();
    await expect(clara.getByRole("button", { name: "+1 · you" })).toBeVisible();
  });

  test("the thank-you card: motif, own words or the dice", async ({ page }) => {
    // Anna asks, Ben takes it on (the mock acts for him), Anna marks it done: the card opens
    await board(page, "Let's talk").click();
    await panel(page).getByRole("combobox").fill("Need a second pair of eyes");
    await panel(page).getByRole("button", { name: "Ask", exact: true }).click();
    await page.evaluate(() => (window as unknown as { ruumbleMock: { helpAs(name: string): void } }).ruumbleMock.helpAs("Ben"));
    const card = panel(page).getByRole("article", { name: "Need a second pair of eyes" });
    await expect(card).toContainText("Ben is helping Anna");
    await card.getByRole("button", { name: "Done" }).click();
    const dialog = page.getByRole("dialog", { name: "Thanks to Ben" });
    await dialog.getByRole("radio", { name: "Rocket" }).check();
    await dialog.getByRole("button", { name: "Another idea" }).click();
    await expect(dialog.getByLabel("Your words")).not.toHaveValue("");
    await dialog.getByLabel("Your words").fill("You rock!");
    await dialog.getByRole("button", { name: "Send thanks" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(card).toContainText("\"You rock!\"");
    // the plaques of the room queue up behind the first one
    await expect(plaque(page, "3")).toContainText("+");
  });

  test("tooltips: only the name, the key behind it where it works (the own room's board)", async ({ page }) => {
    await expect(board(page, "Let's talk")).toHaveAttribute("title", "Task board (H)");
    await expect(board(page, "Ben's office")).toHaveAttribute("title", "Task board");
    await expect(page.getByRole("button", { name: "Show board" })).toHaveAttribute("title", "Board (B)");
  });

  test("H shows and hides the own room's task board; M opens the building overview", async ({ page }) => {
    await page.keyboard.press("h");
    await expect(panel(page).getByRole("heading", { name: "Task board of Let's talk" })).toBeVisible();
    await page.keyboard.press("h");
    await expect(panel(page)).toHaveCount(0);
    await page.keyboard.press("m");
    await expect(page.getByRole("dialog", { name: "Building overview" })).toBeVisible();
  });

  test("H in a place without a task board says so", async ({ page }) => {
    await page.evaluate(() => (window as unknown as { ruumbleMock: { command(b: unknown): Promise<string> } }).ruumbleMock.command({ cmd: "join", channel: 4 }));
    await expect(page.getByRole("button", { name: /^You are here: Let's play/ })).toBeVisible();
    await page.keyboard.press("h");
    await expect(page.getByRole("alert").filter({ hasText: "This place has no task board." })).toBeVisible();
    await expect(panel(page)).toHaveCount(0);
  });
});

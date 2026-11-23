import { expect, test, type Page } from "@playwright/test";
import { elevator, gotoFloor } from "./topbar.ts";

// The cafeteria (#30) against the mock: the root channel ("Acme HQ") is the lobby, and everyone in it sits in the
// cafeteria. Nobody is there at first; Anna is in "Let's talk" on Development.
test.describe("Cafeteria", () => {
  test.beforeEach(async ({ page }) => page.goto("/?fixture=sample&talking=0"));

  const sign = (page: Page) => page.getByRole("button", { name: /^Go to the cafeteria · / });
  const visit = (page: Page, ...names: string[]) =>
    page.evaluate((list) => { for (const n of list) (window as unknown as { ruumbleMock: { moveUserTo(n: string, c: string): void } }).ruumbleMock.moveUserTo(n, "Acme HQ"); }, names);
  const cone = (page: Page) => page.locator(".plan > .cone.north");

  test("the sign takes one there and back, and the view follows, also after choosing another floor", async ({ page }) => {
    for (let i = 0; i < 2; i++) {
      await gotoFloor(page, "2nd floor: Support"); // a floor chosen in the elevator
      await sign(page).click();
      await expect(page.getByRole("heading", { name: "Cafeteria" })).toBeVisible();
      await gotoFloor(page, "Ground floor: Lobby");
      await page.getByRole("button", { name: "Back to Let's talk" }).click();
      await expect(page.getByRole("heading", { name: "Development" })).toBeVisible();
    }
  });

  test("empty: a pale sign in the top bar's row, no light", async ({ page }) => {
    await expect(sign(page)).toHaveAccessibleName("Go to the cafeteria · nobody is there right now");
    await expect(sign(page)).toHaveClass(/empty/);
    await expect(cone(page)).toHaveCSS("opacity", "0");
    // the sign stands above the building, beside the top bar's buttons, not on them
    const s = (await sign(page).boundingBox())!;
    const plan = (await page.locator(".plan").boundingBox())!;
    const right = (await page.locator(".topbar .right").boundingBox())!;
    expect(s.y + s.height).toBeLessThanOrEqual(plan.y);
    expect(s.x + s.width).toBeLessThanOrEqual(right.x);
  });

  test("someone in the root channel: the light comes on, the sign names them and takes one there", async ({ page }) => {
    await visit(page, "Felix", "Gregor", "Hanna");
    await expect(sign(page)).toHaveAccessibleName("Go to the cafeteria · Felix, Gregor and Hanna");
    await expect(sign(page).locator("text").last()).toHaveText("3");
    await expect(cone(page)).toHaveCSS("opacity", "0.8");
    await sign(page).click();
    await expect(page.getByRole("status", { name: /^You are here: Cafeteria/ })).toBeVisible();
    await expect(sign(page)).toHaveCount(0); // inside: no sign to go there, but one back
    await page.getByRole("button", { name: "Back to Let's talk" }).click();
    await expect(page.getByRole("button", { name: /^You are here: Let's talk/ })).toBeVisible();

  });

  test("the lobby below the floors: the cafeteria with one seat per person, lit while someone is inside", async ({ page }) => {
    await gotoFloor(page, "Lobby: Cafeteria");
    const cafe = page.getByRole("button", { name: /^Cafeteria/ });
    await expect(cafe.locator(".interior")).not.toHaveClass(/lit/);
    await visit(page, "Felix", "Gregor", "Hanna", "Ben", "David");
    await expect(cafe.locator(".interior")).toHaveClass(/lit/);
    await expect(cafe.locator(".seated")).toHaveCount(5);
    await expect(cafe).toContainText("5 people");
    // nobody sits on top of someone else
    const boxes = await cafe.locator(".seated .av").evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2, r: r.width / 2 })));
    for (const a of boxes) for (const b of boxes) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r - 1);
    // a double click goes there
    await cafe.dblclick();
    await expect(page.getByRole("status", { name: /^You are here: Cafeteria/ })).toBeVisible();
  });

  test("the old empty lobby is replaced by the lobby: one stop in the elevator, back when someone is in it", async ({ page }) => {
    const move = (names: string[], channel: string) =>
      page.evaluate(([list, c]) => { for (const n of list!) (window as unknown as { ruumbleMock: { moveUserTo(n: string, c: string): void } }).ruumbleMock.moveUserTo(n, c!); }, [names, channel] as [string[], string]);
    const stops = async () => (await elevator(page)).locator("button.floor");
    await expect(await stops()).toHaveCount(4); // the lobby, the old lobby, two floors
    await move(["Felix", "Eva"], "Acme HQ");
    await expect(await stops()).toHaveCount(3);
    await expect((await elevator(page)).getByRole("button", { name: /^Ground floor: Lobby/ })).toHaveCount(0);
    await move(["Eva"], "Lobby");
    await expect(await stops()).toHaveCount(4);
    await expect((await elevator(page)).getByRole("button", { name: /^Ground floor: Lobby/ })).toHaveCount(1);
  });
});

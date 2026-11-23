import { expect, test } from "@playwright/test";
import { gotoFloor } from "./topbar.ts";

// The free part of the lobby (#31) against the mock: a clock and a reception desk with BUG and IDEA signs, centred
// between the west wall and the cafeteria, each only where it fits.
test.describe("Lobby", () => {
  test("a clock with the date, the desk with its bell and the two signs linking to GitHub", async ({ page }) => {
    await page.goto("/?fixture=sample&talking=0");
    await gotoFloor(page, "Lobby: Cafeteria");
    await expect(page.getByRole("img", { name: /^Clock: \d\d:\d\d, \w+day \d+ \w+$/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ruumble on GitHub" })).toHaveAttribute("href", "https://github.com/ruumble-project/ruumble-server");
    await expect(page.getByRole("link", { name: "BUG: report a bug (on GitHub)" })).toHaveAttribute("href", /template=bug_report\.yml$/);
    await expect(page.getByRole("link", { name: "IDEA: suggest an idea (on GitHub)" })).toHaveAttribute("target", "_blank");
    // nothing reaches into the cafeteria
    const cafe = (await page.getByRole("button", { name: /^Cafeteria/ }).boundingBox())!;
    for (const name of [/^Clock/, "BUG: report a bug (on GitHub)", "IDEA: suggest an idea (on GitHub)"]) {
      const box = (await page.getByRole(name instanceof RegExp ? "img" : "link", { name }).boundingBox())!;
      expect(box.x + box.width).toBeLessThan(cafe.x);
    }
  });

  test("a narrow window: the desk goes first, then the clock", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto("/?fixture=sample&talking=0");
    await gotoFloor(page, "Lobby: Cafeteria");
    await expect(page.getByRole("img", { name: /^Clock/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^BUG/ })).toHaveCount(0);
    await page.setViewportSize({ width: 1000, height: 900 });
    await expect(page.getByRole("img", { name: /^Clock/ })).toHaveCount(0);
  });
});

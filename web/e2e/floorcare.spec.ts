import { expect, test, type Page } from "@playwright/test";

// The rooms of a floor in the floor care (client#12): add, rename, order and delete them in Mumble, inside Ruumble
// Client. The client's "desk" is faked as QWebChannel hands it over; it changes the mock's channels the way the real
// client changes Mumble's (window.ruumbleMock, mock mode only).
async function asDesk(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type Mock = { createRoom(p: number, n: string): void; updateChannel(id: number, c: object): void; removeChannel(id: number): void };
    const mock = () => (window as unknown as { ruumbleMock: Mock }).ruumbleMock;
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
      channelProperties: (_id: number, cb: (p: unknown) => void) => cb({ name: "", maxUsers: 0, descriptionHash: "" }),
      updateChannel: (id: number, changes: object, cb: (r: unknown) => void) => {
        setTimeout(() => mock().updateChannel(id, changes), 100);
        cb({ sent: true });
      },
      createChannel: (parent: number, name: string, cb: (r: unknown) => void) => {
        setTimeout(() => mock().createRoom(parent, name), 100);
        cb({ sent: true });
      },
      removeChannel: (id: number, cb: (r: unknown) => void) => {
        setTimeout(() => mock().removeChannel(id), 100);
        cb({ sent: true });
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

const openFloorCare = async (page: Page) => {
  await page.getByRole("button", { name: "Floor care: Development" }).click();
  return page.getByRole("dialog", { name: "Floor care" });
};
/** the room names in the floor plan, in order */
const planRooms = (page: Page) => page.locator(".floorplan [data-channel]").evaluateAll((els) => els.map((e) => e.getAttribute("data-channel")));
/** the lines of "Rooms on this floor" (not the rooms that are gone) */
const lines = (page: Page) => page.getByRole("dialog", { name: "Floor care" }).locator("section").filter({ has: page.getByRole("heading", { name: "Rooms on this floor" }) }).getByRole("listitem");

test("in a browser: the rooms are listed, changing them is for Ruumble Client", async ({ page }) => {
  await page.goto("/?fixture=sample&talking=0");
  const dialog = await openFloorCare(page);
  await expect(lines(page)).toHaveCount(5);
  await expect(dialog.getByRole("button", { name: /^Delete / })).toHaveCount(0);
  await expect(dialog.getByRole("textbox", { name: "Name of the new room" })).toHaveCount(0);
  await expect(dialog.getByText("Adding, renaming, ordering and deleting rooms works in Ruumble Client.", { exact: false })).toBeVisible();
});

test.describe("inside Ruumble Client", () => {
  test.beforeEach(async ({ page }) => {
    await asDesk(page);
    // a browser download instead of the Save as dialog (as in care.spec.ts)
    await page.addInitScript(() => delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker);
    await page.goto("/?fixture=sample&talking=0");
  });

  test("a room is added at the floor; a name in use is refused before it is sent", async ({ page }) => {
    const dialog = await openFloorCare(page);
    const name = dialog.getByRole("textbox", { name: "Name of the new room" });
    await name.fill("ben's office");
    await expect(dialog.getByRole("alert")).toHaveText("This name is already used on this floor.");
    await expect(dialog.getByRole("button", { name: "Add a room" })).toBeDisabled();
    await name.fill("Lab");
    await dialog.getByRole("button", { name: "Add a room" }).click();
    await expect(dialog.getByText("Lab is there.")).toBeVisible();
    await expect(lines(page)).toHaveCount(6);
    await expect(page.locator(".floorplan").getByRole("button", { name: /^Lab – enter/ })).toBeVisible();
    await expect(name).toHaveValue("");
  });

  test("a room is renamed in its line; Escape cancels", async ({ page }) => {
    const dialog = await openFloorCare(page);
    await dialog.getByRole("button", { name: "Rename Retrospective" }).click();
    const input = dialog.getByRole("textbox", { name: "Rename Retrospective" });
    await expect(input).toBeFocused();
    await input.press("Escape");
    await expect(input).toHaveCount(0);
    await expect(dialog).toBeVisible(); // Escape left the dialog open
    await dialog.getByRole("button", { name: "Rename Retrospective" }).click();
    await dialog.getByRole("textbox", { name: "Rename Retrospective" }).fill("Retro corner");
    await dialog.getByRole("textbox", { name: "Rename Retrospective" }).press("Enter");
    await expect(dialog.getByText("Renamed to Retro corner.")).toBeVisible();
    await expect(page.locator(".floorplan").getByRole("button", { name: /^Retro corner – enter/ })).toBeVisible();
  });

  test("arrows and Alt+arrow move a room; the floor plan follows", async ({ page }) => {
    const dialog = await openFloorCare(page);
    await expect(dialog.getByRole("button", { name: "Move Let's talk forward" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Move Clara's office back" })).toBeDisabled();
    const before = await planRooms(page);
    await dialog.getByRole("button", { name: "Move Ben's office forward" }).click();
    const swapped = [...before];
    const [i, j] = [swapped.indexOf("5"), swapped.indexOf("6")];
    [swapped[i], swapped[j]] = [swapped[j]!, swapped[i]!];
    await expect.poll(() => planRooms(page)).toEqual(swapped);
    await expect(lines(page).nth(2)).toContainText("Ben's office");
    await expect(dialog.getByRole("button", { name: "Move Ben's office back" })).toBeEnabled(); // not while the first move runs
    await dialog.getByRole("button", { name: "Move Ben's office back" }).focus();
    await page.keyboard.press("Alt+ArrowDown");
    await expect(lines(page).nth(3)).toContainText("Ben's office");
  });

  test("delete: do not delete, remove the room (its board stays as gone), or delete with all data (ZIP first)", async ({ page }) => {
    const dialog = await openFloorCare(page);
    // Let's play has no board: no ZIP offered
    await dialog.getByRole("button", { name: "Delete Let's play" }).click();
    let confirm = page.getByRole("alertdialog", { name: "Delete Let's play?" });
    await expect(confirm.getByRole("button", { name: "Save the board as ZIP first" })).toHaveCount(0);
    await confirm.getByRole("button", { name: "Do not delete" }).click();
    await expect(confirm).toHaveCount(0);
    await expect(lines(page)).toHaveCount(5);

    // Clara's office has a post: removing the room keeps it under "Gone"
    await dialog.getByRole("button", { name: "Delete Clara's office" }).click();
    confirm = page.getByRole("alertdialog", { name: "Delete Clara's office?" });
    await expect(confirm.getByRole("button", { name: "Save the board as ZIP first" })).toBeVisible();
    await confirm.getByRole("button", { name: "Remove the room" }).click();
    await expect(dialog.getByText("Clara's office is removed", { exact: false })).toBeVisible();
    await expect(lines(page).filter({ hasText: "Clara's office" })).toHaveCount(0);
    await expect(dialog.getByRole("listitem").filter({ hasText: "Clara's office" })).toHaveCount(1); // now under "Gone"
    await expect(page.locator(".floorplan").getByRole("button", { name: /^Clara's office – enter/ })).toHaveCount(0);

    // Let's talk with all data: the ZIP comes first, then nothing is left of it
    await dialog.getByRole("button", { name: "Delete Let's talk" }).click();
    confirm = page.getByRole("alertdialog", { name: "Delete Let's talk?" });
    const download = page.waitForEvent("download");
    await confirm.getByRole("button", { name: "Save the board as ZIP first" }).click();
    expect((await download).suggestedFilename()).toContain("Let-s-talk");
    await confirm.getByRole("button", { name: "Delete with all data" }).click();
    await expect(dialog.getByText("Let's talk is deleted with all its data.")).toBeVisible({ timeout: 10_000 });
    await expect(lines(page).filter({ hasText: "Let's talk" })).toHaveCount(0);
  });
});

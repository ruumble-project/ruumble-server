import { expect, test, type Page } from "@playwright/test";

// How the user transmits inside Ruumble Client (#9 in ruumble-client). The client's "desk" object is faked the way
// QWebChannel hands it over, with the transmit part; `deskTransmit` lets a test change what the client reports.
async function asClient(page: Page, init: { mode: string; key?: unknown }): Promise<void> {
  await page.addInitScript((init) => {
    const calls: unknown[][] = [];
    const handlers = new Map<string, ((v?: unknown) => void)[]>();
    const signal = (name: string) => ({ connect: (h: (v?: unknown) => void) => handlers.set(name, [...(handlers.get(name) ?? []), h]) });
    const emit = (name: string, value?: unknown) => handlers.get(name)?.forEach((h) => h(value));
    const desk: Record<string, unknown> = {
      version: "1.6.0",
      server: "127.0.0.1:64738",
      history: (cb: (entries: unknown[]) => void) => cb([]),
      sendMessage: (_text: string, cb: (ok: boolean) => void) => cb(true),
      openSettings: () => calls.push(["settings"]),
      openConnect: () => {},
      openAudioWizard: () => calls.push(["wizard"]),
      disconnectServer: () => {},
      showMenu: () => {},
      logged: signal("logged"),
      serverChanged: signal("serverChanged"),
      transmitMode: init.mode,
      transmitting: false,
      micLevel: 0,
      latched: false,
      pttKey: init.key ?? { set: false, label: "", codes: [], scope: "global", warn: false },
      pttOptions: { doublePush: false, audioCue: true },
      transmitModeChanged: signal("transmitModeChanged"),
      transmittingChanged: signal("transmittingChanged"),
      micLevelChanged: signal("micLevelChanged"),
      latchedChanged: signal("latchedChanged"),
      pttKeyChanged: signal("pttKeyChanged"),
      pttOptionsChanged: signal("pttOptionsChanged"),
      keyCaptured: signal("keyCaptured"),
      setTransmitMode: (mode: string) => {
        calls.push(["setTransmitMode", mode]);
        desk.transmitMode = mode;
        emit("transmitModeChanged");
      },
      pushToTalk: (down: boolean) => calls.push(["pushToTalk", down]),
      setLatched: (on: boolean) => {
        calls.push(["setLatched", on]);
        desk.latched = on;
        emit("latchedChanged");
      },
      watchLevel: () => {},
      captureKey: () => calls.push(["captureKey"]),
      capturePageKey: (codes: string[]) => {
        calls.push(["capturePageKey", codes]);
        emit("keyCaptured", { set: true, label: codes.join("+"), codes, scope: "global", warn: codes[0] === "KeyQ" });
      },
      cancelCapture: () => calls.push(["cancelCapture"]),
      acceptKey: (cb: (ok: boolean) => void) => {
        calls.push(["acceptKey"]);
        desk.pttKey = { set: true, label: "Control_R", codes: ["ControlRight"], scope: "global", warn: false };
        emit("pttKeyChanged");
        cb(true);
      },
      setPttOption: (name: string, value: unknown) => calls.push(["setPttOption", name, value]),
    };
    Object.assign(window, {
      deskCalls: calls,
      deskTransmit: (changes: Record<string, unknown>) => {
        Object.assign(desk, changes);
        emit("transmittingChanged");
      },
      qt: { webChannelTransport: {} },
      QWebChannel: class {
        constructor(_transport: unknown, ready: (channel: { objects: { desk: unknown } }) => void) {
          ready({ objects: { desk } });
        }
      },
    });
  }, init);
}

const calls = (page: Page) => page.evaluate(() => (window as unknown as { deskCalls: unknown[][] }).deskCalls);
const RIGHT_CTRL = { set: true, label: "Control_R", codes: ["ControlRight"], scope: "global", warn: false };

test("an older client: no mode tab, the microphone mutes as before", async ({ page }) => {
  await page.addInitScript(() => {
    const desk = {
      version: "1.6.0", server: "", history: (cb: (e: unknown[]) => void) => cb([]), sendMessage: () => {}, openSettings: () => {},
      openConnect: () => {}, openAudioWizard: () => {}, disconnectServer: () => {}, showMenu: () => {},
      logged: { connect: () => {} }, serverChanged: { connect: () => {} },
    };
    Object.assign(window, { qt: { webChannelTransport: {} }, QWebChannel: class { constructor(_t: unknown, ready: (c: unknown) => void) { ready({ objects: { desk } }); } } });
  });
  await page.goto("/?fixture=sample&talking=0");
  await expect(page.getByRole("button", { name: "Mute microphone" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Choose how you transmit" })).toHaveCount(0);
});

test("choosing push to talk without a key asks for one, Right Ctrl is suggested", async ({ page }) => {
  await asClient(page, { mode: "vad" });
  await page.goto("/?fixture=sample&talking=0");
  await page.getByRole("button", { name: "Choose how you transmit" }).click();
  const menu = page.getByRole("group", { name: "How you transmit" });
  await expect(menu.getByRole("radio", { name: /Voice activation/ })).toHaveAttribute("aria-checked", "true");
  await menu.getByRole("radio", { name: /Push to talk/ }).click();
  const dialog = page.getByRole("dialog", { name: "Set your talk key" });
  await expect(dialog).toBeVisible();
  // a letter: taken, with a hint that it types in other programs too
  await page.keyboard.press("q");
  await expect(dialog.getByText("The program in front gets this key too", { exact: false })).toBeVisible();
  await dialog.getByRole("button", { name: "Right Ctrl" }).click();
  await dialog.getByRole("button", { name: "Use Right Ctrl" }).click();
  await expect(dialog).toHaveCount(0);
  expect(await calls(page)).toEqual([
    ["setTransmitMode", "ptt"], ["captureKey"], ["capturePageKey", ["KeyQ"]], ["captureKey"],
    ["capturePageKey", ["ControlRight"]], ["captureKey"], ["acceptKey"], ["cancelCapture"],
  ]);
  await expect(page.getByRole("button", { name: /^Hold to talk \(Right Ctrl\)/ })).toBeVisible();
});

test("push to talk: holding the microphone talks, a double click keeps it open, a click closes it", async ({ page }) => {
  await asClient(page, { mode: "ptt", key: RIGHT_CTRL });
  await page.goto("/?fixture=sample&talking=0");
  const mic = page.getByRole("button", { name: /^Hold to talk/ });
  await mic.hover();
  await page.mouse.down();
  await expect(mic).toHaveClass(/\bon\b/);
  await expect(page.locator("header.topbar")).toHaveClass(/talking/);
  await page.mouse.up();
  await expect(mic).not.toHaveClass(/\bon\b/);
  await mic.dblclick();
  const open = page.getByRole("button", { name: "Mic open: click to close it" });
  await expect(open).toHaveClass(/\bon\b/);
  await open.click();
  await expect(page.getByRole("button", { name: /^Hold to talk/ })).not.toHaveClass(/\bon\b/);
  // a click without a press (a screen reader, the keyboard) closes it too
  await mic.dblclick();
  await open.dispatchEvent("click");
  await expect(page.getByRole("button", { name: /^Hold to talk/ })).not.toHaveClass(/\bon\b/);
  const sent = (await calls(page)).filter((c) => c[0] === "pushToTalk" || c[0] === "setLatched").slice(0, 8);
  expect(sent).toEqual([
    ["pushToTalk", true], ["pushToTalk", false], ["pushToTalk", true], ["pushToTalk", false], ["pushToTalk", true], ["pushToTalk", false],
    ["setLatched", true], ["setLatched", false],
  ]);
});

test("the bar lights up whenever Mumble transmits, and the menu says where the key works", async ({ page }) => {
  await asClient(page, { mode: "ptt", key: { ...RIGHT_CTRL, scope: "window" } });
  await page.goto("/?fixture=sample&talking=0");
  await expect(page.locator("header.topbar")).not.toHaveClass(/talking/);
  await page.evaluate(() => (window as unknown as { deskTransmit: (c: object) => void }).deskTransmit({ transmitting: true, micLevel: 0.6 }));
  await expect(page.locator("header.topbar")).toHaveClass(/talking/);
  await expect(page.getByRole("button", { name: "Hold to talk (Right Ctrl, in this window only). Double-click to keep it open." })).toBeVisible();
  await page.getByRole("button", { name: "Choose how you transmit" }).click();
  await expect(page.getByText("Works only while Ruumble is in front", { exact: false })).toBeVisible();
  await page.getByText("Press twice quickly to keep the mic open").click(); // the switch is the label
  await expect(page.getByRole("checkbox", { name: "Press twice quickly to keep the mic open" })).toBeChecked({ checked: false }); // the client decides
  await page.getByRole("button", { name: /More audio settings/ }).click();
  expect((await calls(page)).filter((c) => c[0] === "setPttOption" || c[0] === "settings")).toEqual([["setPttOption", "doublePush", true], ["settings"]]);
});

// Screenshots for the "What's new" page of the next version (#17): the web UI with the sample data (mock), light
// theme, English, cropped to what changed, written to docs/whats-new/images/next/<name>.png.
//   pnpm -F @ruumble/web whats-new-shots                 every shot below
//   pnpm -F @ruumble/web whats-new-shots room-menu       only these
// A new shot: add a function to SHOTS that opens the place and returns the region to crop. Inside Ruumble Client
// features need the fake `desk` (deskScript), as in the e2e tests.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const OUT = new URL("../../docs/whats-new/images/next/", import.meta.url);
const PORT = 5197;
const BASE = `http://127.0.0.1:${PORT}/?fixture=sample&talking=0`;

/** Ruumble Client's desk object, as QWebChannel hands it over (only what the shots need) */
const deskScript = () => {
  const desk = {
    version: "1.6.0", server: "127.0.0.1:64738", history: (cb) => cb([]), sendMessage: (_t, cb) => cb(true),
    // a shot may play an older client (window.shotClientVersion, set before the page loads)
    get clientVersion() { return window.shotClientVersion ?? "unknown"; },
    openSettings() {}, openConnect() {}, openAudioWizard() {}, disconnectServer() {}, showMenu() {},
    channelProperties: (_id, cb) => cb({ name: "", maxUsers: 8, descriptionHash: "" }), updateChannel: (_id, _c, cb) => cb({ sent: true }),
    createChannel: (_p, _n, cb) => cb({ sent: true }), removeChannel: (_id, cb) => cb({ sent: true }),
    logged: { connect() {} }, serverChanged: { connect() {} },
    // listening in (#19): the server confirms at once
    listening: [], listenQuieter: true,
    listeningChanged: { connect(h) { (desk.onListen ??= []).push(h); } }, listenQuieterChanged: { connect() {} }, listeningRefused: { connect() {} },
    startListening(c) { desk.listening = [...desk.listening, { channel: c, volume: 0 }]; desk.onListen?.forEach((h) => h()); },
    stopListening(cs) { desk.listening = desk.listening.filter((l) => !cs.includes(l.channel)); desk.onListen?.forEach((h) => h()); },
    setListeningVolume(c, db) { desk.listening = desk.listening.map((l) => (l.channel === c ? { ...l, volume: db } : l)); desk.onListen?.forEach((h) => h()); },
    setListenQuieter() {},
  };
  Object.assign(window, { qt: { webChannelTransport: {} }, QWebChannel: class { constructor(_t, ready) { ready({ objects: { desk } }); } } });
};

/** the region around some boxes, with a margin, inside the page */
const around = (boxes, margin = 16) => {
  const x = Math.max(0, Math.min(...boxes.map((b) => b.x)) - margin);
  const y = Math.max(0, Math.min(...boxes.map((b) => b.y)) - margin);
  return { x, y, width: Math.max(...boxes.map((b) => b.x + b.width)) + margin - x, height: Math.max(...boxes.map((b) => b.y + b.height)) + margin - y };
};

const SHOTS = {
  "room-menu": async (page) => {
    const sign = page.getByRole("button", { name: /Menu of Let's talk$/ });
    await sign.click();
    return around([await sign.boundingBox(), await page.locator("#room-menu").boundingBox()], 24);
  },
  "room-setup": async (page) => {
    await page.getByRole("button", { name: /Menu of Let's talk$/ }).click();
    await page.getByRole("button", { name: "Room setup …" }).click();
    const dialog = page.getByRole("dialog", { name: "Room setup" });
    await dialog.getByRole("textbox", { name: "Description" }).fill("## Let's talk\n\nThe room for **quick talks**.\n\n- Daily at 9:30\n- [Team wiki](https://example.org)");
    await dialog.getByRole("tab", { name: "Preview" }).click();
    return around([await dialog.boundingBox()], 8);
  },
  description: async (page) => {
    const binders = page.getByRole("button", { name: "Description of Retrospective" });
    await binders.click();
    return around([await binders.boundingBox(), await page.getByRole("dialog", { name: "Description of Retrospective" }).boundingBox()], 16);
  },
  "floor-care": async (page) => {
    await page.getByRole("button", { name: "Floor care: Development" }).click();
    const dialog = page.getByRole("dialog", { name: "Floor care" });
    const rooms = dialog.locator("section").filter({ has: page.getByRole("heading", { name: "Rooms on this floor" }) });
    return around([await rooms.boundingBox()], 12);
  },
  "client-update": async (page) => {
    await page.addInitScript(() => (window.shotClientVersion = "0.38.0"));
    await page.goto(`${BASE}&clientRelease=0.39.0`);
    await page.waitForTimeout(600);
    const badge = page.getByRole("button", { name: /^User menu/ });
    const before = await badge.boundingBox();
    await badge.click();
    const entry = page.getByRole("link", { name: "Ruumble Client 0.39.0 is out" });
    return around([before, await entry.boundingBox()], 14);
  },
  "listen-in": async (page) => {
    await page.getByRole("button", { name: "Listen in on Retrospective" }).click();
    const tag = page.getByRole("button", { name: "Volume for Retrospective" });
    await tag.click();
    const room = page.locator('[data-channel="5"]');
    const box = await room.boundingBox();
    const popup = await page.getByRole("dialog", { name: "Volume for Retrospective" }).boundingBox();
    return around([{ ...box, height: 70 }, popup], 12);
  },
  "light-switch": async (page) => {
    await page.getByRole("button", { name: "User menu" }).click();
    const tiles = page.getByRole("group", { name: "Quick switches" });
    return around([await tiles.boundingBox()], 12);
  },
};

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOTS);
for (const name of wanted) if (!SHOTS[name]) throw new Error(`unknown shot ${name}; known: ${Object.keys(SHOTS).join(", ")}`);
mkdirSync(OUT, { recursive: true });

const vite = spawn("pnpm", ["exec", "vite", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], { cwd: new URL("..", import.meta.url), stdio: "ignore", detached: true });
try {
  for (let i = 0; i < 60; i++) {
    if (await fetch(BASE).then((r) => r.ok, () => false)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  const browser = await chromium.launch();
  for (const name of wanted) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: "en-US", colorScheme: "light", deviceScaleFactor: 1 });
    await page.addInitScript(deskScript);
    await page.addInitScript(() => localStorage.setItem("ruumble.theme", "light"));
    await page.goto(BASE);
    await page.waitForTimeout(600);
    const clip = await SHOTS[name](page);
    await page.mouse.move(1, 1);
    await page.waitForTimeout(300);
    await page.screenshot({ path: new URL(`${name}.png`, OUT).pathname, clip });
    console.log(`docs/whats-new/images/next/${name}.png`);
    await page.close();
  }
  await browser.close();
} finally {
  process.kill(-vite.pid);
}

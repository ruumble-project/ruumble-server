import "@fontsource-variable/inter";
import "./tokens.css";
import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";
import { LiveAdapter } from "./lib/adapter/live.ts";
import { FIXTURES, MockAdapter, type FixtureName } from "./lib/adapter/mock.ts";
import { RuumbleState } from "./lib/state.svelte.ts";

// Ruumble Client shows this page in Qt WebEngine 6.4 (Chromium 102), which has no popover API (Chrome 114): person
// cards and room descriptions need it. Only such engines load the polyfill.
if (!("showPopover" in HTMLElement.prototype)) await import("@oddbird/popover-polyfill");

// Served by the service: LiveAdapter. Mock with ?fixture=<name> or ?mock, by default in the Vite dev server
// (there ?live for the service via the proxy) and always in the demo build (`build:demo`).
// Further parameters for the mock: ?debug, ?talking=0, ?paired=0
const params = new URLSearchParams(location.search);
const useMock =
  import.meta.env.MODE === "demo" || params.has("fixture") || params.has("mock") || (import.meta.env.DEV && !params.has("live"));
const requested = params.get("fixture") ?? "sample";
const fixture = (requested in FIXTURES ? requested : "sample") as FixtureName;
const mock = useMock ? new MockAdapter(fixture, { talking: params.get("talking") !== "0", paired: params.get("paired") !== "0" }) : null;
const app = new RuumbleState(mock ?? new LiveAdapter());
app.start();

mount(App, { target: document.getElementById("app")!, props: { app, mock: mock && params.has("debug") ? mock : null } });

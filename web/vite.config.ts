import { existsSync, readFileSync } from "node:fs";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
// only for the mock: in operation the service reports the version of the plugin it offers
// (the Docker build of the web UI has no plugin/ directory)
const cmake = new URL("../plugin/CMakeLists.txt", import.meta.url);
const pluginVersion = (existsSync(cmake) && /project\(ruumble_plugin VERSION ([\d.]+)/.exec(readFileSync(cmake, "utf8"))?.[1]) || "0.0.0";
// "What's new" in the user menu (#17): the public page of this version on GitHub, or the overview when this version has
// none (a development build, a release without user-visible changes)
const whatsNewPage = existsSync(new URL(`../docs/whats-new/${pkg.version}.md`, import.meta.url)) ? `${pkg.version}.md` : "README.md";
const whatsNewUrl = `https://github.com/ruumble-project/ruumble-server/blob/main/docs/whats-new/${whatsNewPage}`;

export default defineConfig({
  plugins: [svelte()],
  // Ruumble Client (ruumble-project/ruumble-client) shows the UI in Qt WebEngine 6.4 = Chromium 102: syntax and CSS are lowered for it as well
  build: { target: ["chrome102", "edge107", "firefox104", "safari16"] },
  define: { __UI_VERSION__: JSON.stringify(pkg.version), __PLUGIN_VERSION__: JSON.stringify(pluginVersion), __WHATS_NEW_URL__: JSON.stringify(whatsNewUrl) },
  // Workspace packages (e.g. protocol/) live outside web/
  server: {
    fs: { allow: [".."] },
    // ?live in the dev server: service locally on :64080
    proxy: {
      "/ws": { target: "ws://127.0.0.1:64080", ws: true },
      ...Object.fromEntries(["/pair", "/api", "/avatar", "/download"].map((p) => [p, "http://127.0.0.1:64080"])),
    },
  },
});

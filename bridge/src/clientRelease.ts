/**
 * The latest Ruumble Client release (#18): the service asks GitHub every few hours and passes the answer on in
 * /api/version, so the web UI inside an older Ruumble Client can say that a newer one is out. The web UI itself may only
 * talk to its own service (Content-Security-Policy, ADR-0011), and one request per server is kinder to GitHub and to
 * the users' privacy than one per client. CLIENT_RELEASE_CHECK=off switches it off.
 */
import type { ClientRelease } from "@ruumble/protocol";

export const CLIENT_RELEASES = "https://api.github.com/repos/ruumble-project/ruumble-client/releases/latest";

/** GitHub's answer → version and page; null for a draft, a prerelease or a tag that is no version */
export function parseRelease(json: unknown): ClientRelease | null {
  if (!json || typeof json !== "object") return null;
  const r = json as { tag_name?: unknown; html_url?: unknown; draft?: unknown; prerelease?: unknown };
  if (r.draft === true || r.prerelease === true || typeof r.html_url !== "string" || !r.html_url.startsWith("https://")) return null;
  const version = typeof r.tag_name === "string" ? /^v?(\d+\.\d+\.\d+)$/.exec(r.tag_name)?.[1] : undefined;
  return version ? { version, url: r.html_url } : null;
}

export interface WatchOptions {
  fetch?: typeof globalThis.fetch;
  /** between two checks (6 hours) */
  intervalMs?: number;
  log?: (msg: string, extra?: Record<string, unknown>) => void;
}

/** checks now and then every interval; a failed check keeps the last answer. Returns the stop function */
export function watchClientRelease(onRelease: (release: ClientRelease) => void, o: WatchOptions = {}): () => void {
  const get = o.fetch ?? globalThis.fetch;
  const check = async () => {
    try {
      const res = await get(CLIENT_RELEASES, { headers: { Accept: "application/vnd.github+json", "User-Agent": "ruumble-service" }, signal: AbortSignal.timeout(10_000) });
      const release = res.ok ? parseRelease(await res.json()) : null;
      if (release) onRelease(release);
      else o.log?.("Latest Ruumble Client release not known", { status: res.status });
    } catch (e) {
      o.log?.("Latest Ruumble Client release not reachable", { error: String(e) });
    }
  };
  void check();
  const timer = setInterval(check, o.intervalMs ?? 6 * 60 * 60_000);
  timer.unref?.();
  return () => clearInterval(timer);
}

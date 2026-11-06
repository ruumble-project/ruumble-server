import { describe, expect, it, vi } from "vitest";
import { CLIENT_RELEASES, parseRelease, watchClientRelease } from "../src/clientRelease.ts";

const release = { tag_name: "v0.39.0", html_url: "https://github.com/ruumble-project/ruumble-client/releases/tag/v0.39.0", draft: false, prerelease: false };

describe("the latest Ruumble Client release (#18)", () => {
  it("takes a published version and its page", () => {
    expect(parseRelease(release)).toEqual({ version: "0.39.0", url: release.html_url });
    expect(parseRelease({ ...release, tag_name: "0.40.1" })?.version).toBe("0.40.1");
  });

  it("ignores drafts, prereleases, odd tags and foreign pages", () => {
    expect(parseRelease({ ...release, draft: true })).toBeNull();
    expect(parseRelease({ ...release, prerelease: true })).toBeNull();
    expect(parseRelease({ ...release, tag_name: "v0.39.0-rc1" })).toBeNull();
    expect(parseRelease({ ...release, html_url: "http://example.org" })).toBeNull();
    expect(parseRelease(null)).toBeNull();
    expect(parseRelease("x")).toBeNull();
  });

  it("asks GitHub at once and keeps quiet when GitHub does not answer", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(release))).mockRejectedValueOnce(new Error("offline"));
    const seen = vi.fn();
    const log = vi.fn();
    const stop = watchClientRelease(seen, { fetch, intervalMs: 20, log });
    await vi.waitFor(() => expect(seen).toHaveBeenCalledWith({ version: "0.39.0", url: release.html_url }));
    expect(fetch.mock.calls[0]![0]).toBe(CLIENT_RELEASES);
    await vi.waitFor(() => expect(log).toHaveBeenCalledWith("Latest Ruumble Client release not reachable", expect.anything()));
    stop();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("an error answer is logged, not taken", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("rate limited", { status: 403 }));
    const seen = vi.fn();
    const log = vi.fn();
    const stop = watchClientRelease(seen, { fetch, log });
    await vi.waitFor(() => expect(log).toHaveBeenCalledWith("Latest Ruumble Client release not known", { status: 403 }));
    stop();
    expect(seen).not.toHaveBeenCalled();
  });
});

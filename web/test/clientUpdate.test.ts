import { describe, expect, it } from "vitest";
import { clientUpdate, isNewer } from "../src/lib/desk/update.ts";

describe("a newer Ruumble Client (#18)", () => {
  it("compares versions part by part", () => {
    expect(isNewer("0.39.0", "0.38.0")).toBe(true);
    expect(isNewer("0.38.1", "0.38.0")).toBe(true);
    expect(isNewer("1.0.0", "0.99.9")).toBe(true);
    expect(isNewer("0.10.0", "0.9.0")).toBe(true);
    expect(isNewer("0.38.0", "0.38.0")).toBe(false);
    expect(isNewer("0.37.9", "0.38.0")).toBe(false);
    expect(isNewer("v0.39.0", "0.38.0")).toBe(true);
    expect(isNewer("unknown", "0.38.0")).toBe(false);
    expect(isNewer("0.39.0", "dev")).toBe(false);
  });

  it("points to the release only for an older, known client", () => {
    const latest = { version: "0.39.0", url: "https://github.com/ruumble-project/ruumble-client/releases/tag/v0.39.0" };
    expect(clientUpdate("0.38.0", latest)).toBe(latest);
    expect(clientUpdate("0.39.0", latest)).toBeNull();
    expect(clientUpdate("0.40.0", latest)).toBeNull(); // a development build
    expect(clientUpdate(null, latest)).toBeNull(); // a browser, or an older client
    expect(clientUpdate("0.38.0", null)).toBeNull();
    expect(clientUpdate("0.38.0", undefined)).toBeNull(); // an older service
  });
});

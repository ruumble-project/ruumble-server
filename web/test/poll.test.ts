import { afterEach, describe, expect, it, vi } from "vitest";
import { pollUntil } from "../src/lib/poll.ts";

afterEach(() => vi.useRealTimers());

describe("pollUntil", () => {
  it("asks at once and then every step until yes; false after the time is up", async () => {
    vi.useFakeTimers();
    let n = 0;
    const yes = pollUntil(() => ++n === 3, 1000, 100);
    await vi.advanceTimersByTimeAsync(250);
    expect(await yes).toBe(true);
    expect(n).toBe(3);
    let asked = 0;
    const no = pollUntil(async () => (asked++, false), 300, 100);
    await vi.advanceTimersByTimeAsync(400);
    expect(await no).toBe(false);
    expect(asked).toBe(4);
  });
});

import { describe, expect, it } from "vitest";
import { CLOCK, DESK, LOBBY_LINKS, lobbyLayout } from "../src/lib/model/lobby.ts";

describe("the free part of the lobby (#31)", () => {
  it("clock and desk centred between the west wall and the cafeteria when there is room", () => {
    const l = lobbyLayout(1370, 770, 780);
    expect(l.free).toEqual({ width: 590, height: 770 });
    expect(l.clock).toEqual({ x: 295, y: 90 });
    expect(l.desk!.x).toBe(295 - DESK.width / 2);
    expect(l.desk!.y).toBeGreaterThanOrEqual(60 + CLOCK.height + 30);
    expect(l.desk!.y + DESK.height).toBeLessThanOrEqual(770 - 60);
  });

  it("the desk goes first, then the clock, as the free column shrinks", () => {
    expect(lobbyLayout(780 + 289, 770, 780)).toMatchObject({ clock: { x: 144.5 }, desk: null });
    expect(lobbyLayout(780 + 219, 770, 780)).toMatchObject({ clock: null, desk: null });
    expect(lobbyLayout(780 + 300, 770, 780).desk).not.toBeNull();
  });

  it("too low: no desk, and with very little height no clock either", () => {
    expect(lobbyLayout(1400, 400, 780)).toMatchObject({ clock: { y: 90 }, desk: null });
    expect(lobbyLayout(1400, 150, 780).clock).toBeNull();
    expect(lobbyLayout(0, 0, 780).free.width).toBe(0);
  });

  it("the links go to Ruumble on GitHub and its two forms", () => {
    expect(LOBBY_LINKS.bug).toMatch(/issues\/new\?template=bug_report\.yml$/);
    expect(LOBBY_LINKS.idea).toMatch(/issues\/new\?template=feature_request\.yml$/);
  });
});

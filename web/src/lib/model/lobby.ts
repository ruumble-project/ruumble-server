/**
 * The free part of the lobby (#31): what stands left of the cafeteria and where. The cafeteria has a fixed size
 * (model/cafeteria.ts), so the free column shrinks with the window; each item stands only where its whole place fits,
 * centred between the west wall and the cafeteria. The desk goes first, then the clock.
 */

/** Ruumble on GitHub: the bell on the desk, and the two forms of the signs in front of it */
export const LOBBY_LINKS = {
  github: "https://github.com/ruumble-project/ruumble-server",
  bug: "https://github.com/ruumble-project/ruumble-server/issues/new?template=bug_report.yml",
  idea: "https://github.com/ruumble-project/ruumble-server/issues/new?template=feature_request.yml",
} as const;

/** the clock with its date plate: 160 wide, 140 high */
export const CLOCK = { width: 160, height: 140, minFree: 220 } as const;
/** the desk with the chair behind it and the two signs in front: 250 wide, 166 high */
export const DESK = { width: 250, height: 166, minFree: 290 } as const;

export interface LobbyLayout {
  /** the free column left of the cafeteria */
  free: { width: number; height: number };
  /** the clock's centre, null when it does not fit */
  clock: { x: number; y: number } | null;
  /** the desk's top left corner, null when it does not fit */
  desk: { x: number; y: number } | null;
}

/**
 * The layout of a lobby `width` × `height` whose cafeteria is `cafeWidth` wide (at the top right). The free column is
 * everything left of the cafeteria, over the whole height; the entrance takes 60 px at the bottom.
 */
export function lobbyLayout(width: number, height: number, cafeWidth: number): LobbyLayout {
  const free = { width: Math.max(0, width - cafeWidth), height };
  const mid = free.width / 2;
  // the clock hangs below the lobby's name, so it stays clear of it however narrow the column is
  const clock = free.width >= CLOCK.minFree && height >= CLOCK.height + 60 ? { x: mid, y: 90 } : null;
  // the desk stands below the clock's place (whenever the desk fits, the clock fits too)
  const top = 60 + CLOCK.height + 30;
  const room = height - 60 - top;
  const desk =
    free.width >= DESK.minFree && room >= DESK.height
      ? { x: mid - DESK.width / 2, y: top + Math.min(60, (room - DESK.height) / 2) }
      : null;
  return { free, clock, desk };
}

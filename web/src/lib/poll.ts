/**
 * Waiting until a change sent to Mumble shows up (room setup, the rooms of a floor): asks `check` right away and then
 * every `step` ms; false when it still says no after `ms` (refused, no permission, no answer).
 */
export async function pollUntil(check: () => boolean | Promise<boolean>, ms = 6000, step = 200): Promise<boolean> {
  for (let waited = 0; ; waited += step) {
    if (await check()) return true;
    if (waited >= ms) return false;
    await new Promise((r) => setTimeout(r, step));
  }
}

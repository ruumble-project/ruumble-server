/**
 * "A newer Ruumble Client is out" (#18): the client reports its version on the desk, the service the latest release
 * (/api/version). Pure functions.
 */
import type { ClientRelease } from "@ruumble/protocol";

/** major.minor.patch, else null */
function parts(version: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** is `a` a newer version than `b`? false when either is no version */
export function isNewer(a: string, b: string): boolean {
  const x = parts(a);
  const y = parts(b);
  if (!x || !y) return false;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i]! > y[i]!;
  return false;
}

/** the release to point to: only when the running client is known and older (a development build stays quiet) */
export function clientUpdate(running: string | null, latest: ClientRelease | null | undefined): ClientRelease | null {
  return running && latest && isNewer(latest.version, running) ? latest : null;
}

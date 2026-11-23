/**
 * Where the cafeteria's door to the north is (#30), in CAFE_VIEW units: CafeteriaLight puts it right below the chalkboard
 * sign (which stands left of the top bar's tube mail button), the cafeteria in the lobby draws it there.
 */
import { NORTH_DOOR } from "../../model/cafeteria.ts";

export const door = $state<{ x: number }>({ x: NORTH_DOOR.x });

/**
 * Ruumble Desk (ADR-0024): administering the building like in Mumble. Inside the Desk client a right click on a room,
 * corridor, floor or person opens Mumble's own context menu for that channel or user (add, remove, edit, ACL, links,
 * kick, ban, ...), and a person dragged onto a room is moved there. Everything runs with the user's own Mumble
 * permissions in the client; destructive actions always need a click in the native menu. In a normal browser
 * `available` is false and nothing changes (the browser's own context menu stays).
 */
import { getContext, setContext } from "svelte";

/** drag data of a person (their session) */
export const SESSION_DRAG = "application/x-ruumble-session";

export interface DeskAdmin {
  readonly available: boolean;
  channelMenu(channelId: number, x: number, y: number): void;
  userMenu(session: number, x: number, y: number): void;
  moveUser(session: number, channelId: number): void;
}

const KEY = Symbol("ruumble-desk-admin");
export const setDeskAdmin = (admin: DeskAdmin): void => void setContext(KEY, admin);
export const getDeskAdmin = (): DeskAdmin | undefined => getContext<DeskAdmin | undefined>(KEY);

/**
 * A right click: the menu of the person under the pointer, otherwise that of the channel (null: only people here).
 * Returns whether it was handled; when not, the browser's own menu stays.
 */
export function contextMenu(admin: DeskAdmin | undefined, e: MouseEvent, channelId: number | null): boolean {
  if (!admin?.available) return false;
  const person = (e.target as Element | null)?.closest?.<HTMLElement>("[data-session]");
  if (person) {
    e.preventDefault();
    admin.userMenu(Number(person.dataset.session), e.clientX, e.clientY);
    return true;
  }
  if (channelId === null) return false;
  e.preventDefault();
  admin.channelMenu(channelId, e.clientX, e.clientY);
  return true;
}

/** a person is being dragged (only the type is readable while dragging) */
export const carriesPerson = (e: DragEvent): boolean => !!e.dataTransfer?.types.includes(SESSION_DRAG);

/** the dragged person's session on drop, or null */
export function droppedSession(e: DragEvent): number | null {
  const raw = e.dataTransfer?.getData(SESSION_DRAG);
  const session = raw ? Number(raw) : NaN;
  return Number.isInteger(session) && session > 0 ? session : null;
}

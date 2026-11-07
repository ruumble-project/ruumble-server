/**
 * Ruumble's edit dialog for a room or floor (#15): name, description in Markdown, maximum users. Pure functions; the
 * change itself goes through Ruumble Client's `desk` (Mumble's ChannelState), the result comes with the next snapshot.
 */
import type { Channel } from "@ruumble/protocol";

/**
 * Channel descriptions are Markdown, stored as plain text (#5, #15). Mumble's rich text (HTML from its own dialog) is
 * no longer supported: such a description is read as text, its links and bold or italic text turned into Markdown.
 * Until 2026-11-07 Ruumble put a marker line in front of its descriptions; old ones still have it.
 */
const LEGACY_MARKER = /^\s*<!-- ruumble:markdown -->[ \t]*\r?\n?/;

export interface ChannelForm {
  name: string;
  /** Markdown */
  description: string;
  maxUsers: number;
}

export interface ChannelChanges {
  name?: string;
  /** as stored: the Markdown, or empty */
  description?: string;
  maxUsers?: number;
}

export type FormProblem = "name-empty" | "name-taken" | "max-users";

/**
 * A stored description as Markdown, for showing it and for the editor: an old marker line goes; HTML from Mumble's
 * dialog becomes text, line breaks and list items kept, links and bold or italic text as Markdown.
 */
export function descriptionMarkdown(stored: string): string {
  const text = stored.replace(LEGACY_MARKER, "").trim();
  if (!/<[a-z!/][^>]*>/i.test(text)) return text;
  return decodeEntities(
    text
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<head[\s\S]*?<\/head>/gi, "")
      .replace(/<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_all, href: string, label: string) => {
        const inner = label.replace(/<[^>]+>/g, "").trim();
        if (!/^(https?:|mailto:)/i.test(href)) return inner; // no javascript: and the like, only the text
        return inner && inner !== href ? `[${inner}](${href})` : href;
      })
      .replace(/<(b|strong)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, "**$3**")
      .replace(/<(i|em)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, "*$3*")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : all;
    }
    return named[code.toLowerCase()] ?? all;
  });
}

/** what is stored in Mumble: the Markdown as plain text, or nothing at all */
export function storedDescription(markdown: string): string {
  return markdown.trim();
}

/** the form as it opens for a channel */
export function formOf(channel: Pick<Channel, "name" | "description">, maxUsers: number): ChannelForm {
  return { name: channel.name, description: descriptionMarkdown(channel.description ?? ""), maxUsers };
}

/** what keeps the form from being saved; the name must be unique among its siblings, as Mumble wants it */
export function formProblem(form: ChannelForm, channel: Pick<Channel, "id" | "parent">, channels: readonly Pick<Channel, "id" | "parent" | "name">[]): FormProblem | null {
  const name = nameProblem(form.name, channel.parent ?? -1, channels, channel.id);
  if (name) return name === "empty" ? "name-empty" : "name-taken";
  if (!Number.isInteger(form.maxUsers) || form.maxUsers < 0) return "max-users";
  return null;
}

export type NameProblem = "empty" | "taken";

/** a room's name on its floor: not empty and not used by another room there (Mumble refuses the same name twice) */
export function nameProblem(name: string, parentId: number, channels: readonly Pick<Channel, "id" | "parent" | "name">[], self?: number): NameProblem | null {
  const n = name.trim().toLowerCase();
  if (!n) return "empty";
  return channels.some((c) => c.parent === parentId && c.id !== self && c.name.trim().toLowerCase() === n) ? "taken" : null;
}

/** only what changed; an unchanged description is not sent, so an old HTML one stays as it is */
export function changesOf(before: ChannelForm, after: ChannelForm): ChannelChanges {
  const changes: ChannelChanges = {};
  if (after.name.trim() !== before.name.trim()) changes.name = after.name.trim();
  if (after.description.trim() !== before.description.trim()) changes.description = storedDescription(after.description);
  if (after.maxUsers !== before.maxUsers) changes.maxUsers = after.maxUsers;
  return changes;
}

/** has the client's view of the channel caught up with what was sent? */
export function applied(sent: ChannelChanges, sentHash: string | undefined, now: { name: string; maxUsers: number; descriptionHash: string }): boolean {
  if (sent.name !== undefined && now.name !== sent.name) return false;
  if (sent.maxUsers !== undefined && now.maxUsers !== sent.maxUsers) return false;
  if (sent.description !== undefined && (sentHash ?? "") !== now.descriptionHash) return false;
  return true;
}

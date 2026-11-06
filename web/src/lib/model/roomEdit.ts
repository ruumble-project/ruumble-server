/**
 * Ruumble's edit dialog for a room or floor (#15): name, description in Markdown, maximum users. Pure functions; the
 * change itself goes through Ruumble Client's `desk` (Mumble's ChannelState), the result comes with the next snapshot.
 */
import type { Channel } from "@ruumble/protocol";

/**
 * First line of a description written in Ruumble: the description is Markdown (#5). Mumble clients do not show an
 * HTML comment, so the official client shows the plain text below it.
 */
export const MARKDOWN_MARKER = "<!-- ruumble:markdown -->";

export interface ChannelForm {
  name: string;
  /** Markdown, without the marker line */
  description: string;
  maxUsers: number;
}

export interface ChannelChanges {
  name?: string;
  /** as stored: with the marker line, or empty */
  description?: string;
  maxUsers?: number;
}

export type FormProblem = "name-empty" | "name-taken" | "max-users";

/** is the stored description one written in Ruumble (Markdown)? */
export function isMarkdownDescription(stored: string): boolean {
  return stored.trimStart().startsWith(MARKDOWN_MARKER);
}

/**
 * The text for the editor: a Markdown description without its marker line; an older HTML one (Mumble's dialog)
 * as plain text, line breaks kept, so it can be rewritten in Markdown.
 */
export function editableDescription(stored: string): string {
  const text = stored.trim();
  if (isMarkdownDescription(text)) return text.slice(MARKDOWN_MARKER.length).replace(/^\r?\n/, "");
  if (!/<[a-z!/][^>]*>/i.test(text)) return text;
  return decodeEntities(
    text
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<head[\s\S]*?<\/head>/gi, "")
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

/** what is stored in Mumble: the marker line and the Markdown, or nothing at all */
export function storedDescription(markdown: string): string {
  const text = markdown.trim();
  return text ? `${MARKDOWN_MARKER}\n${text}` : "";
}

/** the form as it opens for a channel */
export function formOf(channel: Pick<Channel, "name" | "description">, maxUsers: number): ChannelForm {
  return { name: channel.name, description: editableDescription(channel.description ?? ""), maxUsers };
}

/** what keeps the form from being saved; the name must be unique among its siblings, as Mumble wants it */
export function formProblem(form: ChannelForm, channel: Pick<Channel, "id" | "parent">, channels: readonly Pick<Channel, "id" | "parent" | "name">[]): FormProblem | null {
  const name = form.name.trim();
  if (!name) return "name-empty";
  const taken = channels.some((c) => c.id !== channel.id && c.parent === channel.parent && c.name.trim().toLowerCase() === name.toLowerCase());
  if (taken) return "name-taken";
  if (!Number.isInteger(form.maxUsers) || form.maxUsers < 0) return "max-users";
  return null;
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

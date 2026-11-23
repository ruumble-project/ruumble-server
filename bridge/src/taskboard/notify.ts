/**
 * Lines in the Mumble log for the task board (#29), in the language of each recipient. Mumble prefixes "Ruumble:" and
 * escapes HTML itself, so the texts stay plain text; a line holds at most 300 characters (BridgeNotify).
 */
import type { Locale, TaskEvent, ThanksMotif } from "@ruumble/protocol";

const NOTIFY_CHARS = 300;
const name = (n: string) => n.slice(0, 60);
const quote = (text: string, locale: Locale) => (locale === "de" ? `„${text}“` : `"${text}"`);

const MOTIF: Record<Locale, Record<ThanksMotif, string>> = {
  de: { coffee: "Kaffee", cake: "Kuchen", rocket: "Rakete", trophy: "Pokal", flowers: "Blumen", "high-five": "High five", lifebuoy: "Rettungsring", star: "Stern" },
  en: { coffee: "coffee", cake: "cake", rocket: "rocket", trophy: "trophy", flowers: "flowers", "high-five": "high five", lifebuoy: "lifebuoy", star: "star" },
};

/** `forYou`: the line for the person it is about (the target of a request, the asker when someone takes it on) */
export function taskText(e: TaskEvent, locale: Locale = "de", forYou = false): string {
  const t = quote(e.text, locale);
  const by = name(e.by.name);
  const asker = name(e.asker.name);
  const helper = e.helper ? name(e.helper.name) : "";
  const room = e.room ? name(e.room) : "";
  const de = locale === "de";
  let line: string;
  switch (e.kind) {
    case "asked":
      line = forYou && e.target
        ? de ? `${by} bittet dich an der Aufgabentafel von ${room} um Hilfe: ${t}` : `${by} asks you for help on the task board of ${room}: ${t}`
        : e.target
          ? de ? `${by} bittet ${name(e.target.name)} an der Aufgabentafel um Hilfe: ${t}` : `${by} asks ${name(e.target.name)} for help on the task board: ${t}`
          : de ? `${by} bittet an der Aufgabentafel um Hilfe: ${t}` : `${by} asks for help on the task board: ${t}`;
      break;
    case "plus":
      line = de ? `${by} braucht das auch (${e.affected} betroffen): ${t}` : `${by} needs this too (${e.affected} affected): ${t}`;
      break;
    case "taken":
      line = forYou
        ? de ? `${by} hilft dir: ${t}` : `${by} is helping you: ${t}`
        : de ? `${by} hilft ${asker}: ${t}` : `${by} is helping ${asker}: ${t}`;
      break;
    case "back":
      line = de ? `Die Bitte von ${asker} ist wieder offen: ${t}` : `${asker}'s request is open again: ${t}`;
      break;
    case "done":
      line = de ? `Erledigt: ${helper} hat ${asker} geholfen: ${t}` : `Done: ${helper} helped ${asker}: ${t}`;
      break;
    case "solved":
      line = de ? `${asker} hat es selbst gelöst: ${t}` : `${asker} solved it: ${t}`;
      break;
    case "reopened":
      line = de ? `${by} hat die Bitte wieder geöffnet: ${t}` : `${by} reopened the request: ${t}`;
      break;
    case "thanks": {
      const card = e.thanks ? `${MOTIF[locale][e.thanks.motif]}${e.thanks.text ? `, ${quote(e.thanks.text, locale)}` : ""}` : "";
      line = forYou
        ? de ? `${asker} sagt dir danke (${card}) für: ${t}` : `${asker} thanks you (${card}) for: ${t}`
        : de ? `${asker} sagt ${helper} danke (${card})` : `${asker} thanks ${helper} (${card})`;
      break;
    }
  }
  return line.length <= NOTIFY_CHARS ? line : `${line.slice(0, NOTIFY_CHARS - 1)}…`;
}

/** to the asker, when their helper has gone and the request still shows "being helped" */
export function forgottenText(helper: string, text: string, room: string, locale: Locale = "de"): string {
  const line = locale === "de"
    ? `${name(helper)} hilft dir bei ${quote(text, locale)}, ist aber nicht mehr da. Ist das erledigt? Schau an der Aufgabentafel von ${name(room)} nach.`
    : `${name(helper)} is helping you with ${quote(text, locale)} but has left. Is it done? Have a look at the task board of ${name(room)}.`;
  return line.length <= NOTIFY_CHARS ? line : `${line.slice(0, NOTIFY_CHARS - 1)}…`;
}

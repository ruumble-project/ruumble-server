// "What's new" pages (#17), called by tools/release.sh: node tools/whats-new-release.mjs <version> <yyyy-mm-dd> [dir]
// Turns docs/whats-new/next.md into <version>.md (title, date, links to the previous version and the overview), moves
// images/next/ to images/<version>/, gives the previous page its link to this one, adds the version to README.md and
// starts next.md again. Without user-visible changes in next.md it does nothing and says so.
import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [version, date, dir = new URL("../docs/whats-new/", import.meta.url).pathname] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(version ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  console.error("usage: node tools/whats-new-release.mjs <major.minor.patch> <yyyy-mm-dd> [dir]");
  process.exit(2);
}
const file = (name) => join(dir, name);
const next = readFileSync(file("next.md"), "utf8");

// next.md: the instructions (an HTML comment), the legend, then the changes
const comment = /^<!--[\s\S]*?-->\n*/.exec(next)?.[0] ?? "";
const LEGEND = "Changes marked `server update` reach you once the Ruumble server you use is updated.";
const body = next.slice(comment.length).replace(LEGEND, "").trim();
if (!/^(###|- )/m.test(body)) {
  console.log(`whats-new: no user-visible changes in next.md, no page for ${version}`);
  process.exit(0);
}
if (existsSync(file(`${version}.md`))) throw new Error(`${version}.md exists already`);

// the version before: the first line of the overview
const readme = readFileSync(file("README.md"), "utf8");
const previous = /^- \[(\d+\.\d+\.\d+)\]\(/m.exec(readme)?.[1] ?? null;

const when = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const nav = [previous ? `[← ${previous}](${previous}.md)` : null, "[All versions](README.md)"].filter(Boolean).join(" · ");
const page = [nav, "", `# What's new in Ruumble ${version}`, "", `*${when}*`, "", LEGEND, "", body.replaceAll("images/next/", `images/${version}/`), "", nav, ""].join("\n");
writeFileSync(file(`${version}.md`), page);

// pictures
const images = file("images/next");
if (existsSync(images) && readdirSync(images).length) renameSync(images, file(`images/${version}`));

// the previous page links forward to this one (its navigation lines, top and bottom)
if (previous && existsSync(file(`${previous}.md`))) {
  const old = readFileSync(file(`${previous}.md`), "utf8");
  writeFileSync(file(`${previous}.md`), old.replace(/^(.*\[All versions\]\(README\.md\))$/gm, `$1 · [${version} →](${version}.md)`));
}

// the overview: newest on top, with the headings of the larger changes as the highlights
const highlights = [...body.matchAll(/^### (.+)$/gm)].map((m) => m[1].replace(/\s*`[^`]*`\s*/g, "").trim());
const line = `- [${version}](${version}.md) · ${when}${highlights.length ? ` · ${highlights.join(", ")}` : ""}`;
const MARK = "<!-- versions: tools/release.sh adds a line here for every release with a page -->";
if (!readme.includes(MARK)) throw new Error("README.md has lost its versions marker");
writeFileSync(file("README.md"), readme.replace(MARK, `${MARK}\n${line}`));

// next.md starts again, with its instructions and the legend
writeFileSync(file("next.md"), `${comment.trimEnd()}\n\n${LEGEND}\n`);
console.log(`whats-new: docs/whats-new/${version}.md`);

import { describe, expect, it } from "vitest";
import {
  applied, changesOf, descriptionMarkdown, formOf, formProblem, storedDescription,
} from "../src/lib/model/roomEdit.ts";

describe("Ruumble's edit dialog (#15)", () => {
  it("a description is stored as plain Markdown; an old marker line goes", () => {
    expect(storedDescription("  # Retro\n\n- every Friday  ")).toBe("# Retro\n\n- every Friday");
    expect(storedDescription("   ")).toBe("");
    expect(descriptionMarkdown("<!-- ruumble:markdown -->\n# Retro\n\n- every Friday")).toBe("# Retro\n\n- every Friday");
    expect(descriptionMarkdown("# Retro")).toBe("# Retro");
  });

  it("Mumble's rich text becomes Markdown: text with its line breaks and lists, links and bold or italic kept", () => {
    const html = '<!DOCTYPE html><html><head><style>p{}</style></head><body><p>Hello &amp; welcome<br/>to <b>Sales</b> and <i>more</i></p><ul><li>one</li><li>two</li></ul><p>&lt;tag&gt; &#228;&#x2764;&nbsp;&bogus;</p></body></html>';
    expect(descriptionMarkdown(html)).toBe("Hello & welcome\nto **Sales** and *more*\n- one\n- two\n<tag> ä❤ &bogus;");
    expect(descriptionMarkdown('<p>Board: <a href="https://example.com/b">the board</a>, <a href="https://example.com/x">https://example.com/x</a></p>')).toBe(
      "Board: [the board](https://example.com/b), https://example.com/x",
    );
    expect(descriptionMarkdown('<a href="javascript:alert(1)">click</a>')).toBe("click");
    expect(descriptionMarkdown("plain text, no tags")).toBe("plain text, no tags");
  });

  it("the form opens with the channel's values", () => {
    expect(formOf({ name: "Retro", description: "<!-- ruumble:markdown -->\nhi" }, 5)).toEqual({ name: "Retro", description: "hi", maxUsers: 5 });
    expect(formOf({ name: "Retro", description: undefined as unknown as string }, 0).description).toBe("");
  });

  it("an empty or taken name and a negative limit keep the form from being saved", () => {
    const channels = [{ id: 1, parent: 0, name: "Dev" }, { id: 2, parent: 1, name: "Retro" }, { id: 3, parent: 1, name: "Kitchen" }, { id: 4, parent: 0, name: "Kitchen 2" }];
    const room = { id: 2, parent: 1 };
    expect(formProblem({ name: "  ", description: "", maxUsers: 0 }, room, channels)).toBe("name-empty");
    expect(formProblem({ name: "kitchen", description: "", maxUsers: 0 }, room, channels)).toBe("name-taken");
    expect(formProblem({ name: "Retro", description: "", maxUsers: 0 }, room, channels)).toBeNull(); // its own name
    expect(formProblem({ name: "Kitchen 2", description: "", maxUsers: 0 }, room, channels)).toBeNull(); // on another floor
    expect(formProblem({ name: "Retro", description: "", maxUsers: -1 }, room, channels)).toBe("max-users");
    expect(formProblem({ name: "Retro", description: "", maxUsers: 1.5 }, room, channels)).toBe("max-users");
  });

  it("only what changed is sent; an untouched old description stays as it is", () => {
    const before = { name: "Retro", description: "Hello", maxUsers: 0 };
    expect(changesOf(before, { ...before })).toEqual({});
    expect(changesOf(before, { name: " Retro 2 ", description: "Hello ", maxUsers: 8 })).toEqual({ name: "Retro 2", maxUsers: 8 });
    expect(changesOf(before, { ...before, description: "**Hi**" })).toEqual({ description: "**Hi**" });
    expect(changesOf(before, { ...before, description: "" })).toEqual({ description: "" });
  });

  it("the change counts as taken over once the client's channel shows it", () => {
    const now = { name: "Retro 2", maxUsers: 8, descriptionHash: "abc" };
    expect(applied({ name: "Retro 2", maxUsers: 8 }, undefined, now)).toBe(true);
    expect(applied({ name: "Retro 3" }, undefined, now)).toBe(false);
    expect(applied({ maxUsers: 9 }, undefined, now)).toBe(false);
    expect(applied({ description: "x" }, "abc", now)).toBe(true);
    expect(applied({ description: "x" }, "def", now)).toBe(false);
    expect(applied({ description: "" }, "", { ...now, descriptionHash: "" })).toBe(true);
  });
});

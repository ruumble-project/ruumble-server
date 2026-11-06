import { describe, expect, it } from "vitest";
import {
  MARKDOWN_MARKER, applied, changesOf, editableDescription, formOf, formProblem, isMarkdownDescription, storedDescription,
} from "../src/lib/model/roomEdit.ts";

describe("Ruumble's edit dialog (#15)", () => {
  it("a Markdown description is stored with the marker line and edited without it", () => {
    const stored = storedDescription("  # Retro\n\n- every Friday  ");
    expect(stored).toBe(`${MARKDOWN_MARKER}\n# Retro\n\n- every Friday`);
    expect(isMarkdownDescription(stored)).toBe(true);
    expect(editableDescription(stored)).toBe("# Retro\n\n- every Friday");
    expect(storedDescription("   ")).toBe("");
  });

  it("an older HTML description becomes plain text with its line breaks", () => {
    const html = '<!DOCTYPE html><html><head><style>p{}</style></head><body><p>Hello &amp; welcome<br/>to <b>Sales</b></p><ul><li>one</li><li>two</li></ul><p>&lt;tag&gt; &#228;&#x2764;&nbsp;&bogus;</p></body></html>';
    expect(editableDescription(html)).toBe("Hello & welcome\nto Sales\n- one\n- two\n<tag> ä❤ &bogus;");
    expect(editableDescription("plain text, no tags")).toBe("plain text, no tags");
    expect(isMarkdownDescription(html)).toBe(false);
  });

  it("the form opens with the channel's values", () => {
    expect(formOf({ name: "Retro", description: `${MARKDOWN_MARKER}\nhi` }, 5)).toEqual({ name: "Retro", description: "hi", maxUsers: 5 });
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
    expect(changesOf(before, { ...before, description: "**Hi**" })).toEqual({ description: `${MARKDOWN_MARKER}\n**Hi**` });
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

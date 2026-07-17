import { describe, expect, it } from "vitest";
import { htmlSerializeIfNeeded, renderMarkdown } from "../MessageFormatter";

describe("htmlSerializeIfNeeded", () => {
    it.each([
        ["plain text", "hello"],
        ["text holding HTML special characters", 'a < b & "c" > d'],
        ["a single line break", "line1\nline2"],
        ["a blank line", "line1\n\nline2"],
    ])("returns no formatted body for %s", async (_case, body) => {
        // A formatted_body that only repeats the body pushes every receiving client into the HTML path
        // for nothing, so it must be omitted. Element omits it on the same inputs.
        await expect(htmlSerializeIfNeeded(body)).resolves.toBeUndefined();
    });

    it.each([
        ["bold", "**bold**", "<strong>bold</strong>"],
        ["a heading", "# title", "<h1>title</h1>"],
        ["a list", "- item", "<li>item</li>"],
        ["inline code", "`code`", "<code>code</code>"],
        ["a blockquote", "> quote", "<blockquote>"],
    ])("renders %s to a formatted body", async (_case, body, expected) => {
        await expect(htmlSerializeIfNeeded(body)).resolves.toContain(expected);
    });

    it("escapes HTML special characters it renders", async () => {
        // The body is plain text straight from the composer. It must never be able to smuggle markup
        // into the formatted body.
        await expect(htmlSerializeIfNeeded("**bold** a < b & c")).resolves.toContain("a &lt; b &amp; c");
    });

    it("renders a fenced code block", async () => {
        // Exercises the lazy highlight.js / marked-highlight path.
        const formattedBody = await htmlSerializeIfNeeded("```js\nconst a = 1;\n```");
        expect(formattedBody).toContain("<code");
        expect(formattedBody).toContain("const");
    });
});

describe("renderMarkdown", () => {
    it("escapes HTML special characters coming from a plain text body", async () => {
        await expect(renderMarkdown("a < b & c")).resolves.toContain("a &lt; b &amp; c");
    });

    it("turns a line break into a <br>", async () => {
        await expect(renderMarkdown("line1\nline2")).resolves.toContain("<br>");
    });
});

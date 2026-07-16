import { describe, expect, it } from "vitest";
import { findPreviewableLinks } from "../LinkExtractor";

function render(html: string): Element {
    const root = document.createElement("div");
    root.innerHTML = html;
    return root;
}

describe("findPreviewableLinks", () => {
    it("previews a deep link", () => {
        expect(findPreviewableLinks(render(`<a href="https://example.com/article">example.com/article</a>`))).toEqual([
            "https://example.com/article",
        ]);
    });

    it("previews a labelled link even when the label has no slash", () => {
        expect(findPreviewableLinks(render(`<a href="https://example.com">Read this</a>`))).toEqual([
            "https://example.com",
        ]);
    });

    // Prose autolinks bare hosts constantly; a card under each would be unbearable.
    it("skips a bare host that autolinked", () => {
        expect(findPreviewableLinks(render(`<a href="https://example.com">example.com</a>`))).toEqual([]);
        expect(findPreviewableLinks(render(`<a href="https://foo.pl">foo.pl</a>`))).toEqual([]);
    });

    it.each(["PRE", "CODE", "BLOCKQUOTE"])("skips links inside %s", (tag) => {
        const html = `<${tag.toLowerCase()}><a href="https://example.com/x">example.com/x</a></${tag.toLowerCase()}>`;
        expect(findPreviewableLinks(render(html))).toEqual([]);
    });

    it("finds links nested in other markup", () => {
        expect(
            findPreviewableLinks(
                render(`<p><strong><em><a href="https://example.com/deep">example.com/deep</a></em></strong></p>`),
            ),
        ).toEqual(["https://example.com/deep"]);
    });

    it("deduplicates while keeping discovery order", () => {
        const html = `
            <a href="https://b.com/2">b.com/2</a>
            <a href="https://a.com/1">a.com/1</a>
            <a href="https://b.com/2">b.com/2 again</a>`;
        expect(findPreviewableLinks(render(html))).toEqual(["https://b.com/2", "https://a.com/1"]);
    });

    it.each(["mailto:someone@example.com", "matrix:u/a:example.com", "/relative/path", "#anchor"])(
        "skips the non-http(s) href %s",
        (href) => {
            expect(findPreviewableLinks(render(`<a href="${href}">something/here</a>`))).toEqual([]);
        },
    );

    it("skips links back to our own origin", () => {
        const html = `<a href="${window.location.origin}/@/world/room">${window.location.origin}/@/world/room</a>`;
        expect(findPreviewableLinks(render(html))).toEqual([]);
    });

    it("returns nothing for a message without links", () => {
        expect(findPreviewableLinks(render(`<p>just some words</p>`))).toEqual([]);
    });

    // A reply is rendered from formatted_body HTML, which never reaches our markdown
    // renderer. Reading the DOM is what makes this case work at all.
    it("finds links in already formed reply HTML", () => {
        const html = `<p>agreed, see <a href="https://example.com/doc">example.com/doc</a></p>`;
        expect(findPreviewableLinks(render(html))).toEqual(["https://example.com/doc"]);
    });
});

import { describe, expect, it } from "vitest";
import { resolveChatLinkClick } from "../ChatLinkPolicy";

function anchorFor(href: string | null): HTMLAnchorElement {
    const anchor = document.createElement("a");
    if (href !== null) {
        anchor.setAttribute("href", href);
    }
    return anchor;
}

function leftClick(overrides: Partial<MouseEventInit> = {}): MouseEvent {
    return new MouseEvent("click", { button: 0, ...overrides });
}

describe("resolveChatLinkClick", () => {
    it("embeds a plain left click on an external http(s) link", () => {
        expect(resolveChatLinkClick(anchorFor("https://example.com/page"), leftClick())).toBe(
            "https://example.com/page",
        );
        expect(resolveChatLinkClick(anchorFor("http://example.com"), leftClick())).toBe("http://example.com/");
    });

    // Hijacking these would break the muscle memory of "open this in a new tab".
    it.each([
        ["ctrl", { ctrlKey: true }],
        ["meta", { metaKey: true }],
        ["shift", { shiftKey: true }],
        ["alt", { altKey: true }],
    ])("leaves a %s-click to the browser", (_name, modifier) => {
        expect(resolveChatLinkClick(anchorFor("https://example.com"), leftClick(modifier))).toBeUndefined();
    });

    it("leaves middle and right clicks to the browser", () => {
        expect(resolveChatLinkClick(anchorFor("https://example.com"), leftClick({ button: 1 }))).toBeUndefined();
        expect(resolveChatLinkClick(anchorFor("https://example.com"), leftClick({ button: 2 }))).toBeUndefined();
    });

    it.each(["mailto:someone@example.com", "matrix:u/someone:example.com", "javascript:alert(1)", "ftp://example.com"])(
        "does not embed the non-http(s) scheme %s",
        (href) => {
            expect(resolveChatLinkClick(anchorFor(href), leftClick())).toBeUndefined();
        },
    );

    it("does not embed relative links, anchors or a missing href", () => {
        expect(resolveChatLinkClick(anchorFor("#section"), leftClick())).toBeUndefined();
        expect(resolveChatLinkClick(anchorFor("/some/path"), leftClick())).toBeUndefined();
        expect(resolveChatLinkClick(anchorFor("not a url"), leftClick())).toBeUndefined();
        expect(resolveChatLinkClick(anchorFor(null), leftClick())).toBeUndefined();
    });

    // Embedding WorkAdventure inside WorkAdventure.
    it("does not embed a link back to our own origin", () => {
        expect(resolveChatLinkClick(anchorFor(`${window.location.origin}/@/world/room`), leftClick())).toBeUndefined();
    });

    // The anchor resolves this one for us; the raw attribute would blow up new URL() downstream.
    it("returns an absolute url for a protocol-relative link", () => {
        expect(resolveChatLinkClick(anchorFor("//example.com/page"), leftClick())).toBe(
            `${window.location.protocol}//example.com/page`,
        );
    });
});

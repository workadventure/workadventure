import { describe, expect, it } from "vitest";
import { isTypingTarget } from "./CustomTypeGuards";

describe("isTypingTarget", () => {
    it("recognises the elements where a key must keep its text-input behaviour", () => {
        const contentEditable = document.createElement("div");
        contentEditable.contentEditable = "true";

        expect(isTypingTarget(document.createElement("input"))).toBe(true);
        expect(isTypingTarget(document.createElement("textarea"))).toBe(true);
        expect(isTypingTarget(document.createElement("select"))).toBe(true);
        expect(isTypingTarget(contentEditable)).toBe(true);
        expect(isTypingTarget(document.createElement("button"))).toBe(false);
        expect(isTypingTarget(null)).toBe(false);
    });
});

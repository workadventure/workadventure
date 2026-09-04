import { describe, expect, it } from "vitest";
import { MAX_MATRIX_MESSAGE_CHARS, splitChatMessage } from "./ChatMessageSplitter";

describe("ChatMessageSplitter", () => {
    it("keeps messages under the limit as a single chunk", () => {
        expect(splitChatMessage("Hello world", 40)).toEqual(["Hello world"]);
    });

    it("splits long messages under the configured limit", () => {
        const chunks = splitChatMessage("a".repeat(MAX_MATRIX_MESSAGE_CHARS + 1));

        expect(chunks).toHaveLength(2);
        expect(chunks.every((chunk) => chunk.length <= MAX_MATRIX_MESSAGE_CHARS)).toBe(true);
        expect(chunks.join("")).toBe("a".repeat(MAX_MATRIX_MESSAGE_CHARS + 1));
    });

    it("prefers paragraph boundaries when possible", () => {
        expect(splitChatMessage("First paragraph.\n\nSecond paragraph.", 20)).toEqual([
            "First paragraph.\n\n",
            "Second paragraph.",
        ]);
    });

    it("falls back to line and word boundaries before strict splitting", () => {
        expect(splitChatMessage("First line\nSecond line", 12)).toEqual(["First line\n", "Second line"]);
        expect(splitChatMessage("alpha beta gamma", 11)).toEqual(["alpha beta ", "gamma"]);
    });

    it("strictly splits a word larger than the limit", () => {
        expect(splitChatMessage("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
    });
});

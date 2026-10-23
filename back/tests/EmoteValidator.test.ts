import { describe, expect, it } from "vitest";
import { isValidEmote, isValidWokaEmote, MAX_EMOTE_LENGTH } from "../src/Services/EmoteValidator";

describe("EmoteValidator", () => {
    it("accepts the emojis of the default emote menu", () => {
        for (const emoji of ["👍", "❤️", "😂", "👏", "😍", "🙏"]) {
            expect(isValidEmote(emoji)).toBe(true);
        }
    });

    it("accepts composed emojis", () => {
        // Family (ZWJ sequence), skin tone modifier, country flag and subdivision flag.
        for (const emoji of ["👨‍👩‍👧‍👦", "👋🏽", "🇫🇷", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"]) {
            expect(isValidEmote(emoji)).toBe(true);
        }
    });

    it("refuses HTML markup", () => {
        expect(isValidEmote('<img src=x onerror=alert("XSS")>')).toBe(false);
        expect(isValidEmote("👍<img src=x onerror=alert(1)>")).toBe(false);
        expect(isValidEmote("<script>alert(1)</script>")).toBe(false);
    });

    it("refuses plain text and empty emotes", () => {
        expect(isValidEmote("hello")).toBe(false);
        expect(isValidEmote("")).toBe(false);
        expect(isValidEmote(" ")).toBe(false);
    });

    it("refuses overly long emotes", () => {
        expect(isValidEmote("👍".repeat(MAX_EMOTE_LENGTH))).toBe(false);
    });
});

describe("isValidWokaEmote", () => {
    it("accepts a known animation, with or without an emoji riding along", () => {
        expect(isValidWokaEmote("dance", "")).toBe(true);
        expect(isValidWokaEmote("dance", "🕺")).toBe(true);
    });

    it("refuses an animation it has never heard of", () => {
        // What a front deployed ahead of this back sends. The emote then degrades to its emoji
        // rather than being dropped, which is handled in SocketManager.
        expect(isValidWokaEmote("breakdance", "🕺")).toBe(false);
        expect(isValidWokaEmote("", "🕺")).toBe(false);
    });

    it("refuses an animation carrying something that is not an emoji", () => {
        expect(isValidWokaEmote("dance", "<img src=x onerror=alert(1)>")).toBe(false);
        expect(isValidWokaEmote("dance", "hello")).toBe(false);
    });
});

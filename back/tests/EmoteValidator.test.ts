import { describe, expect, it } from "vitest";
import { isValidEmote, MAX_EMOTE_LENGTH } from "../src/Services/EmoteValidator";

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

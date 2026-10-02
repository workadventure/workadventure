import { describe, it, expect } from "vitest";
import { StringUtils } from "../../../src/front/Utils/StringUtils";

describe("StringUtils", () => {
    describe("containsNonLatinCharacters", () => {
        it("should return false for basic Latin characters", () => {
            expect(StringUtils.containsNonLatinCharacters("John")).toBe(false);
            expect(StringUtils.containsNonLatinCharacters("Alice")).toBe(false);
            expect(StringUtils.containsNonLatinCharacters("Player123")).toBe(false);
            expect(StringUtils.containsNonLatinCharacters("Test User")).toBe(false);
        });

        it("should return false for Latin Extended characters", () => {
            expect(StringUtils.containsNonLatinCharacters("José")).toBe(false);
            expect(StringUtils.containsNonLatinCharacters("François")).toBe(false);
            expect(StringUtils.containsNonLatinCharacters("Müller")).toBe(false);
            expect(StringUtils.containsNonLatinCharacters("Björn")).toBe(false);
            expect(StringUtils.containsNonLatinCharacters("Åse")).toBe(false);
        });

        it("should return true for Arabic characters", () => {
            expect(StringUtils.containsNonLatinCharacters("محمد")).toBe(true);
            expect(StringUtils.containsNonLatinCharacters("أحمد")).toBe(true);
            expect(StringUtils.containsNonLatinCharacters("فاطمة")).toBe(true);
        });

        it("should return true for Chinese characters", () => {
            expect(StringUtils.containsNonLatinCharacters("张三")).toBe(true);
            expect(StringUtils.containsNonLatinCharacters("李四")).toBe(true);
            expect(StringUtils.containsNonLatinCharacters("王五")).toBe(true);
        });

        it("should return true for Japanese characters", () => {
            expect(StringUtils.containsNonLatinCharacters("田中")).toBe(true);
            expect(StringUtils.containsNonLatinCharacters("さくら")).toBe(true);
            expect(StringUtils.containsNonLatinCharacters("ひろし")).toBe(true);
            expect(StringUtils.containsNonLatinCharacters("カナダ")).toBe(true);
        });

        it("should return true for Korean characters", () => {
            expect(StringUtils.containsNonLatinCharacters("김철수")).toBe(true);
            expect(StringUtils.containsNonLatinCharacters("박영희")).toBe(true);
            expect(StringUtils.containsNonLatinCharacters("이민수")).toBe(true);
        });

        it("should return true for mixed content with non-Latin characters", () => {
            expect(StringUtils.containsNonLatinCharacters("John张三")).toBe(true);
            expect(StringUtils.containsNonLatinCharacters("Player محمد")).toBe(true);
            expect(StringUtils.containsNonLatinCharacters("Test田中")).toBe(true);
        });

        it("should return false for empty string", () => {
            expect(StringUtils.containsNonLatinCharacters("")).toBe(false);
        });

        it("should return false for numbers and symbols only", () => {
            expect(StringUtils.containsNonLatinCharacters("123")).toBe(false);
            expect(StringUtils.containsNonLatinCharacters("!@#$%")).toBe(false);
            expect(StringUtils.containsNonLatinCharacters("123!@#")).toBe(false);
        });
    });

    describe("toUrlHashName", () => {
        it("should keep a name that already works in a URL", () => {
            expect(StringUtils.toUrlHashName("reception")).toBe("reception");
            expect(StringUtils.toUrlHashName("from-lobby")).toBe("from-lobby");
            expect(StringUtils.toUrlHashName("room_2")).toBe("room_2");
        });

        it("should lowercase the name and replace spaces with dashes", () => {
            expect(StringUtils.toUrlHashName("  Main  Hall ")).toBe("main-hall");
        });

        it("should drop accents but keep the letters", () => {
            expect(StringUtils.toUrlHashName("Réception")).toBe("reception");
            expect(StringUtils.toUrlHashName("Café Ölçü")).toBe("cafe-olcu");
        });

        it("should remove the characters that break the URL hash", () => {
            expect(StringUtils.toUrlHashName("a&b=c#d%e")).toBe("abcde");
            expect(StringUtils.toUrlHashName("hall!@$^*.")).toBe("hall");
        });
    });
});

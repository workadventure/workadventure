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
});

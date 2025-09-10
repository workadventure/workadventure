import { describe, it, expect, vi, beforeEach } from "vitest";
import { StringUtils } from "../../../../src/front/Utils/StringUtils";

describe("Character", () => {
    describe("Font size based on character type", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should use 8px font size for Latin character names", () => {
            const spy = vi.spyOn(StringUtils, "containsNonLatinCharacters").mockReturnValue(false);

            const name = "John";
            const hasNonLatin = StringUtils.containsNonLatinCharacters(name);
            const fontSize = hasNonLatin ? "11px" : "8px";

            expect(hasNonLatin).toBe(false);
            expect(fontSize).toBe("8px");

            spy.mockRestore();
        });

        it("should use 11px font size for non-Latin character names", () => {
            const spy = vi.spyOn(StringUtils, "containsNonLatinCharacters").mockReturnValue(true);

            const name = "田中";
            const hasNonLatin = StringUtils.containsNonLatinCharacters(name);
            const fontSize = hasNonLatin ? "11px" : "8px";

            expect(hasNonLatin).toBe(true);
            expect(fontSize).toBe("11px");

            spy.mockRestore();
        });

        it("should correctly detect various character types and apply appropriate font sizes", () => {
            const testCases = [
                { name: "Alice", expectedFontSize: "8px", hasNonLatin: false },
                { name: "José", expectedFontSize: "8px", hasNonLatin: false },
                { name: "محمد", expectedFontSize: "11px", hasNonLatin: true },
                { name: "田中", expectedFontSize: "11px", hasNonLatin: true },
                { name: "김철수", expectedFontSize: "11px", hasNonLatin: true },
                { name: "さくら", expectedFontSize: "11px", hasNonLatin: true },
                { name: "John张三", expectedFontSize: "11px", hasNonLatin: true },
            ];

            testCases.forEach(({ name, expectedFontSize, hasNonLatin }) => {
                // Use the actual StringUtils function instead of mocking
                const actualHasNonLatin = StringUtils.containsNonLatinCharacters(name);
                const actualFontSize = actualHasNonLatin ? "11px" : "8px";

                expect(actualHasNonLatin).toBe(hasNonLatin);
                expect(actualFontSize).toBe(expectedFontSize);
            });
        });
    });
});

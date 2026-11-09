import { describe, expect, it } from "vitest";
import type { TypingPart } from "./typingIndicator";
import { truncateName, typingParts } from "./typingIndicator";

const english = (names: string[]) =>
    typingParts(
        names,
        "en-US",
        (count, list) => (count === 1 ? `${list} is typing` : `${list} are typing`),
        (count) => `${count} others`,
    );
const flatten = (parts: TypingPart[]) => parts.map((part) => ("name" in part ? `[${part.name}]` : part.text)).join("");

describe("typingParts", () => {
    it("says nothing when nobody types", () => {
        expect(english([])).toEqual([]);
    });

    it("names one, two and three people", () => {
        expect(flatten(english(["Bob"]))).toBe("[Bob] is typing");
        expect(flatten(english(["Bob", "Alice"]))).toBe("[Bob] and [Alice] are typing");
        expect(flatten(english(["Bob", "Alice", "Chloé"]))).toBe("[Bob], [Alice], and [Chloé] are typing");
    });

    it("counts the others past three, without setting them in bold", () => {
        expect(flatten(english(["Bob", "Alice", "Chloé", "David"]))).toBe("[Bob], [Alice], and 2 others are typing");
    });

    it("lets the language put the list where it belongs", () => {
        const japanese = typingParts(
            ["Bob"],
            "ja-JP",
            (_count, list) => `${list}が入力中`,
            (count) => `他${count}人`,
        );
        expect(japanese).toEqual([{ name: "Bob" }, { text: "が入力中" }]);
    });

    it("cuts long names", () => {
        expect(truncateName("Bob")).toBe("Bob");
        expect(truncateName("Bartholomew Smithson")).toBe("Bartholomew Smi…");
        expect(truncateName("Bartholomew Smithson")).toHaveLength(16);
    });
});

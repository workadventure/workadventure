import { expect, test } from "vitest";
import { interpolate, resolveNativeLocale, sanitizeStringTable, textDirection } from "../../src/native-locale-policy";

test("native locale matches on the language prefix and falls back to English", () => {
    expect(resolveNativeLocale("fr-CA")).toBe("fr");
    expect(resolveNativeLocale("fr")).toBe("fr");
    expect(resolveNativeLocale("pt_BR")).toBe("pt");
    expect(resolveNativeLocale("en-GB")).toBe("en");
    expect(resolveNativeLocale("sv-SE")).toBe("en");
    expect(resolveNativeLocale("")).toBe("en");
});

test("native locale splits Chinese by script", () => {
    expect(resolveNativeLocale("zh-CN")).toBe("zh-CN");
    expect(resolveNativeLocale("zh")).toBe("zh-CN");
    expect(resolveNativeLocale("zh-TW")).toBe("zh-TW");
    expect(resolveNativeLocale("zh-HK")).toBe("zh-TW");
    expect(resolveNativeLocale("zh-Hant-TW")).toBe("zh-TW");
});

test("interpolate fills known placeholders and keeps unknown ones", () => {
    expect(interpolate("Close {count} tabs", { count: 3 })).toBe("Close 3 tabs");
    expect(interpolate("{a} and {b}", { a: "x" })).toBe("x and {b}");
    expect(interpolate("No params")).toBe("No params");
});

test("string tables must be flat, string-valued and bounded", () => {
    expect(sanitizeStringTable({ lang: "fr-FR", "companion.chat": "Discussion" })).toStrictEqual({
        lang: "fr-FR",
        "companion.chat": "Discussion",
    });
    expect(sanitizeStringTable(null)).toBe(undefined);
    expect(sanitizeStringTable(["a"])).toBe(undefined);
    expect(sanitizeStringTable({ nested: { a: "b" } })).toBe(undefined);
    expect(sanitizeStringTable({ a: "x".repeat(1001) })).toBe(undefined);
    const tooMany: Record<string, string> = {};
    for (let i = 0; i < 501; i++) {
        tooMany["k" + i] = "v";
    }
    expect(sanitizeStringTable(tooMany)).toBe(undefined);
});

test("Arabic reads right to left, the other shipped languages left to right", () => {
    expect(textDirection("ar")).toBe("rtl");
    expect(textDirection("ar-SA")).toBe("rtl");
    expect(textDirection("fr")).toBe("ltr");
    expect(textDirection("zh-TW")).toBe("ltr");
    expect(textDirection("")).toBe("ltr");
});

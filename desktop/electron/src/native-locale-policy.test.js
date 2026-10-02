const test = require("node:test");
const assert = require("node:assert/strict");

const { interpolate, resolveNativeLocale, sanitizeStringTable, textDirection } = require("./native-locale-policy");

test("native locale matches on the language prefix and falls back to English", () => {
    assert.equal(resolveNativeLocale("fr-CA"), "fr");
    assert.equal(resolveNativeLocale("fr"), "fr");
    assert.equal(resolveNativeLocale("pt_BR"), "pt");
    assert.equal(resolveNativeLocale("en-GB"), "en");
    assert.equal(resolveNativeLocale("sv-SE"), "en");
    assert.equal(resolveNativeLocale(""), "en");
});

test("native locale splits Chinese by script", () => {
    assert.equal(resolveNativeLocale("zh-CN"), "zh-CN");
    assert.equal(resolveNativeLocale("zh"), "zh-CN");
    assert.equal(resolveNativeLocale("zh-TW"), "zh-TW");
    assert.equal(resolveNativeLocale("zh-HK"), "zh-TW");
    assert.equal(resolveNativeLocale("zh-Hant-TW"), "zh-TW");
});

test("interpolate fills known placeholders and keeps unknown ones", () => {
    assert.equal(interpolate("Close {count} tabs", { count: 3 }), "Close 3 tabs");
    assert.equal(interpolate("{a} and {b}", { a: "x" }), "x and {b}");
    assert.equal(interpolate("No params"), "No params");
});

test("string tables must be flat, string-valued and bounded", () => {
    assert.deepEqual(sanitizeStringTable({ lang: "fr-FR", "companion.chat": "Discussion" }), {
        lang: "fr-FR",
        "companion.chat": "Discussion",
    });
    assert.equal(sanitizeStringTable(null), undefined);
    assert.equal(sanitizeStringTable(["a"]), undefined);
    assert.equal(sanitizeStringTable({ nested: { a: "b" } }), undefined);
    assert.equal(sanitizeStringTable({ a: "x".repeat(1001) }), undefined);
    const tooMany = {};
    for (let i = 0; i < 501; i++) {
        tooMany["k" + i] = "v";
    }
    assert.equal(sanitizeStringTable(tooMany), undefined);
});

test("Arabic reads right to left, the other shipped languages left to right", () => {
    assert.equal(textDirection("ar"), "rtl");
    assert.equal(textDirection("ar-SA"), "rtl");
    assert.equal(textDirection("fr"), "ltr");
    assert.equal(textDirection("zh-TW"), "ltr");
    assert.equal(textDirection(""), "ltr");
});

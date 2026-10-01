"use strict";

// Languages of the native catalog (src/i18n/), the same set as the WorkAdventure front. Chinese is
// split by script; every other language is matched on its prefix only (fr-CA → fr).
const NATIVE_LOCALES = [
    "ar",
    "ca",
    "de",
    "dsb",
    "en",
    "es",
    "fr",
    "hsb",
    "it",
    "ja",
    "ko",
    "nl",
    "pt",
    "th",
    "vi",
    "zh-CN",
    "zh-TW",
];

/** Map an OS/Chromium locale (app.getLocale(), e.g. "fr-CA", "zh-Hant-TW") to a catalog key. */
function resolveNativeLocale(appLocale) {
    const parts = String(appLocale || "")
        .replace(/_/g, "-")
        .toLowerCase()
        .split("-");
    const language = parts[0];
    if (language === "zh") {
        // Traditional script (explicit Hant, or a region that writes it) → zh-TW; the rest → zh-CN.
        return parts.slice(1).some((part) => ["hant", "tw", "hk", "mo"].includes(part)) ? "zh-TW" : "zh-CN";
    }
    return NATIVE_LOCALES.includes(language) ? language : "en";
}

/** Replace `{name}` placeholders; unknown placeholders are left as-is. */
function interpolate(template, params) {
    if (!params) {
        return template;
    }
    return template.replace(/\{(\w+)\}/g, (match, name) =>
        Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
    );
}

// Bounds for a string table pushed by a world renderer (the HUD strings): a few hundred UI labels.
const MAX_TABLE_ENTRIES = 500;
const MAX_KEY_LENGTH = 100;
const MAX_VALUE_LENGTH = 1000;

/** A flat `Record<string, string>` of bounded size, or undefined if the payload is anything else. */
function sanitizeStringTable(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return undefined;
    }
    const entries = Object.entries(payload);
    if (entries.length > MAX_TABLE_ENTRIES) {
        return undefined;
    }
    const table = {};
    for (const [key, value] of entries) {
        if (key.length > MAX_KEY_LENGTH || typeof value !== "string" || value.length > MAX_VALUE_LENGTH) {
            return undefined;
        }
        table[key] = value;
    }
    return table;
}

module.exports = {
    NATIVE_LOCALES,
    resolveNativeLocale,
    interpolate,
    sanitizeStringTable,
};

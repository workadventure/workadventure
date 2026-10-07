// Languages of the native catalog (src/i18n/), the same set as the WorkAdventure front. Chinese is
// split by script; every other language is matched on its prefix only (fr-CA → fr).
export const NATIVE_LOCALES = [
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
] as const;

export type NativeLocale = typeof NATIVE_LOCALES[number];

function isNativeLocale(value: string): value is NativeLocale {
    return (NATIVE_LOCALES as readonly string[]).includes(value);
}

/** Map an OS/Chromium locale (app.getLocale(), e.g. "fr-CA", "zh-Hant-TW") to a catalog key. */
export function resolveNativeLocale(appLocale: string): NativeLocale {
    const parts = (appLocale || "").replace(/_/g, "-").toLowerCase().split("-");
    const language = parts[0];
    if (language === "zh") {
        // Traditional script (explicit Hant, or a region that writes it) → zh-TW; the rest → zh-CN.
        return parts.slice(1).some((part) => ["hant", "tw", "hk", "mo"].includes(part)) ? "zh-TW" : "zh-CN";
    }
    return isNativeLocale(language) ? language : "en";
}

/** Replace `{name}` placeholders; unknown placeholders are left as-is. */
export function interpolate(template: string, params?: Record<string, string | number>): string {
    if (!params) {
        return template;
    }
    return template.replace(/\{(\w+)\}/g, (match: string, name: string) =>
        Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
    );
}

// Bounds for a string table pushed by a world renderer (the HUD strings): a few hundred UI labels.
const MAX_TABLE_ENTRIES = 500;
const MAX_KEY_LENGTH = 100;
const MAX_VALUE_LENGTH = 1000;

/** A flat `Record<string, string>` of bounded size, or undefined if the payload is anything else. */
export function sanitizeStringTable(payload: unknown): Record<string, string> | undefined {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return undefined;
    }
    const entries = Object.entries(payload);
    if (entries.length > MAX_TABLE_ENTRIES) {
        return undefined;
    }
    const table: Record<string, string> = {};
    for (const [key, value] of entries) {
        if (key.length > MAX_KEY_LENGTH || typeof value !== "string" || value.length > MAX_VALUE_LENGTH) {
            return undefined;
        }
        table[key] = value;
    }
    return table;
}

// Right-to-left scripts. Of the shipped languages only Arabic, but a pushed `lang` can be anything.
const RTL_LANGUAGES = ["ar", "fa", "he", "ur"];

/** "rtl" or "ltr" for an HTML `dir` attribute, from a language tag such as "ar-SA" or "fr". */
export function textDirection(lang: string): "rtl" | "ltr" {
    const language = (lang || "").toLowerCase().split(/[-_]/)[0];
    return RTL_LANGUAGES.includes(language) ? "rtl" : "ltr";
}

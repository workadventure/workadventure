import type { NativeStringKey } from "../i18n/en";
import { interpolate, textDirection } from "../native-locale-policy";
import type { SettingsApi } from "./api";

export const api = (window as Window & { WASettings?: SettingsApi }).WASettings;

type SettingsKey = Extract<NativeStringKey, `settings.${string}`>;

// Strings in the OS language (native catalog in the main process), fetched synchronously so the page
// never flashes another language. Main fills a missing translation with the English one.
let strings: Record<string, string> = {};
try {
    const native = api?.getStrings();
    if (native) {
        strings = native.strings;
        document.documentElement.lang = native.lang;
        document.documentElement.dir = textDirection(native.lang);
    }
} catch (err) {
    console.warn("Settings: strings unavailable", err);
}

export function t(key: SettingsKey, params?: Record<string, string | number>): string {
    return interpolate(strings[key] ?? key, params);
}

document.title = t("settings.title");

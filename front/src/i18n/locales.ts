import { detectLocale, navigatorDetector, initLocalStorageDetector } from "typesafe-i18n/detectors";
import { FALLBACK_LOCALE } from "../Enum/EnvironmentVariable";
import { setLocale } from "./i18n-svelte";
import type { Locales } from "./i18n-types";
import { baseLocale, i18n, locales } from "./i18n-util";
import { loadLocaleAsync, loadNamespaceAsync } from "./i18n-util.async";

const fallbackLocale = (FALLBACK_LOCALE || baseLocale) as Locales;
const localStorageProperty = "language";

export const localeDetector = async () => {
    const exist = localStorage.getItem(localStorageProperty);
    let detectedLocale: Locales = fallbackLocale;

    if (exist) {
        const localStorageDetector = initLocalStorageDetector(localStorageProperty);
        detectedLocale = detectLocale(fallbackLocale, locales, localStorageDetector);
    } else {
        detectedLocale = detectLocale(fallbackLocale, locales, navigatorDetector);
    }

    await setCurrentLocale(detectedLocale);
};

export const setCurrentLocale = async (locale: Locales) => {
    localStorage.setItem(localStorageProperty, locale);
    await loadLocaleAsync(locale);
    setLocale(locale);
};

export type DisplayableLocale = { id: Locales; language: string; country: string };

export async function getDisplayableLocales() {
    const localesObject: DisplayableLocale[] = [];
    const L = i18n();
    await Promise.all(locales.map((locale) => loadNamespaceAsync(locale, "meta")));
    locales.forEach((locale) => {
        localesObject.push({
            id: locale,
            language: L[locale].meta.language(),
            country: L[locale].meta.country(),
        });
    });

    return localesObject;
}

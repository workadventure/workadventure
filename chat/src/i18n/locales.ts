import { detectLocale, navigatorDetector } from "typesafe-i18n/detectors"; // eslint-disable-line import/no-unresolved
import { FALLBACK_LOCALE } from "../Enum/EnvironmentVariable";
import { setLocale } from "./i18n-svelte";
import type { Locales } from "./i18n-types";
import { baseLocale, locales } from "./i18n-util";
import { loadLocaleAsync } from "./i18n-util.async";

const fallbackLocale = (FALLBACK_LOCALE || baseLocale) as Locales;

export const localeDetector = async () => {
    let detectedLocale: Locales = fallbackLocale;
    detectedLocale = detectLocale(fallbackLocale, locales, navigatorDetector);
    await setCurrentLocale(detectedLocale);
};

export const setCurrentLocale = async (locale: Locales) => {
    //localStorage.setItem(localStorageProperty, locale);
    await loadLocaleAsync(locale);
    setLocale(locale);
};

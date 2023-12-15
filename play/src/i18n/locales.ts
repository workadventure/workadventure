import { detectLocale, navigatorDetector, initLocalStorageDetector } from "typesafe-i18n/detectors"; // eslint-disable-line import/no-unresolved
import { setLocale } from "./i18n-svelte";
import type { Locales } from "./i18n-types";
import { baseLocale, isLocale, locales } from "./i18n-util";
import { loadLocaleAsync } from "./i18n-util.async";

let fallbackLocale: Locales = baseLocale;
const localStorageProperty = "language";

async function getFallbackLocale(): Promise<Locales> {
    if (window) {
        const envVars = await import("../front/Enum/EnvironmentVariable");
        const envFallbackLocale = envVars.FALLBACK_LOCALE ?? "";

        if (isLocale(envFallbackLocale)) {
            fallbackLocale = envFallbackLocale;
        }
    } else {
        const envVars = await import("../pusher/enums/EnvironmentVariable");
        const envFallbackLocale = envVars.FALLBACK_LOCALE ?? "";

        if (isLocale(envFallbackLocale)) {
            fallbackLocale = envFallbackLocale;
        }
    }
    return fallbackLocale;
}

export const localeDetector = async () => {
    const exist = localStorage.getItem(localStorageProperty);
    const fallbackLocale = await getFallbackLocale();
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

export const displayableLocales: { id: Locales; language: string | undefined; region: string | undefined }[] =
    locales.map((locale) => {
        const [language, region] = locale.split("-");

        // backwards compatibility
        if (!Intl.DisplayNames) {
            return { id: locale, language, region };
        }

        return {
            id: locale,
            language: new Intl.DisplayNames(locale, { type: "language" }).of(language),
            region: new Intl.DisplayNames(locale, { type: "region" }).of(region),
        };
    });

import { detectLocale, initLocalStorageDetector, navigatorDetector } from "typesafe-i18n/detectors";
import type { Locales } from "../../i18n/i18n-types";
import { baseLocale, isLocale, locales } from "../../i18n/i18n-util";
import { loadLocaleAsync } from "../../i18n/i18n-util.async";
import { setLocale } from "../../i18n/i18n-svelte";
import { FALLBACK_LOCALE } from "../Enum/EnvironmentVariable";

let fallbackLocale: Locales = baseLocale;
const localStorageProperty = "language";

function getFallbackLocale(): Locales {
    const envFallbackLocale = FALLBACK_LOCALE ?? "";

    if (isLocale(envFallbackLocale)) {
        fallbackLocale = envFallbackLocale;
    }
    return fallbackLocale;
}

let initPromise: Promise<void> | undefined;

export const localeDetector = async () => {
    if (!initPromise) {
        initPromise = (async () => {
            const exist = localStorage.getItem(localStorageProperty);
            const fallbackLocale = getFallbackLocale();
            let detectedLocale: Locales = fallbackLocale;

            if (exist) {
                const localStorageDetector = initLocalStorageDetector(localStorageProperty);
                detectedLocale = detectLocale(fallbackLocale, locales, localStorageDetector);
            } else {
                detectedLocale = detectLocale(fallbackLocale, locales, navigatorDetector);
            }

            await setCurrentLocale(detectedLocale);
        })();
    }
    return initPromise;
};

export const setCurrentLocale = async (locale: Locales) => {
    localStorage.setItem(localStorageProperty, locale);
    await loadLocaleAsync(locale);
    setLocale(locale);
    // Let's update the locale in the HTML lang tag
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar-SA" ? "rtl" : "ltr";
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

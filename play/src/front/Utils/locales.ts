import { detectLocale, initLocalStorageDetector } from "typesafe-i18n/detectors";
import type { Locales } from "../../i18n/i18n-types";
import { baseLocale, isLocale, locales } from "../../i18n/i18n-util";
import { loadLocaleAsync } from "../../i18n/i18n-util.async";
import { setLocale } from "../../i18n/i18n-svelte";
import { FALLBACK_LOCALE } from "../Enum/EnvironmentVariable";

let fallbackLocale: Locales = baseLocale;
const localStorageProperty = "language";

/**
 * Custom locale detector that first tries to find exact matches,
 * then falls back to the first available variant for the language code
 * @internal - exported for testing purposes
 */
export function createCustomNavigatorDetector() {
    const customDetector = (): Locales[] => {
        const navigatorLanguages = navigator.languages || [navigator.language];
        const detectedLocales: Locales[] = [];

        for (const lang of navigatorLanguages) {
            // First try exact match
            if (isLocale(lang)) {
                detectedLocales.push(lang);
                continue;
            }

            // Then try to find the first available variant for this language
            const genericLang = lang.split("-")[0];
            const availableVariant = locales.find((locale) => locale.startsWith(genericLang + "-"));
            if (availableVariant) {
                detectedLocales.push(availableVariant);
            }
        }

        return detectedLocales;
    };

    return customDetector;
}

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
                const customNavigatorDetector = createCustomNavigatorDetector();
                detectedLocale = detectLocale(fallbackLocale, locales, customNavigatorDetector);
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

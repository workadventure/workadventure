import { detectLocale, navigatorDetector, initLocalStorageDetector } from "typesafe-i18n/detectors";
import { FALLBACK_LOCALE } from "../Enum/EnvironmentVariable";
import { initI18n, setLocale } from "./i18n-svelte";
import type { Locales, Translation } from "./i18n-types";
import { baseLocale, getTranslationForLocale, locales } from "./i18n-util";

const fallbackLocale = FALLBACK_LOCALE || baseLocale;
const localStorageProperty = "language";

export const localeDetector = async () => {
    const exist = localStorage.getItem(localStorageProperty);
    let detectedLocale: Locales = fallbackLocale as Locales;

    if (exist) {
        const localStorageDetector = initLocalStorageDetector(localStorageProperty);
        detectedLocale = detectLocale(fallbackLocale, locales, localStorageDetector) as Locales;
    } else {
        detectedLocale = detectLocale(fallbackLocale, locales, navigatorDetector) as Locales;
    }

    await initI18n(detectedLocale);
};

export const setCurrentLocale = (locale: Locales) => {
    localStorage.setItem(localStorageProperty, locale);
    setLocale(locale).catch(() => {
        console.log("Cannot reload the locale!");
    });
};

export type DisplayableLocale = { id: Locales; language: string; country: string };

function getDisplayableLocales() {
    const localesObject: DisplayableLocale[] = [];
    locales.forEach((locale) => {
        getTranslationForLocale(locale)
            .then((translations) => {
                localesObject.push({
                    id: locale,
                    language: translations.language,
                    country: translations.country,
                });
            })
            .catch((error) => {
                console.log(error);
            });
    });

    return localesObject;
}

export const displayableLocales = getDisplayableLocales();

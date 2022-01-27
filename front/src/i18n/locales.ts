import { detectLocale, navigatorDetector, initLocalStorageDetector } from "typesafe-i18n/detectors";
import { FALLBACK_LOCALE } from "../Enum/EnvironmentVariable";
import { initI18n, setLocale, locale } from "./i18n-svelte";
import type { Locales, Translation } from "./i18n-types";
import { baseLocale, getTranslationForLocale, locales } from "./i18n-util";
import { get } from "svelte/store";

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

export const i18nJson = (text: string): string => {
    if (text.trim().startsWith("{")) {
        try {
            const textObject = JSON.parse(text);
            if (textObject[get(locale)]) {
                return textObject[get(locale)];
            } else if (Object.keys(textObject).length > 0) {
                // fallback to first value
                return textObject[Object.keys(textObject)[0]];
            }
        } catch (err) {
            //
        }
    }
    return text;
};

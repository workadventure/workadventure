import { FALLBACK_LANGUAGE } from "../Enum/EnvironmentVariable";
import { getCookie } from "../Utils/Cookies";

export type Language = {
    language: string;
    country: string;
};

type LanguageObject = {
    [key: string]: string | LanguageObject;
};

class Translator {
    public readonly fallbackLanguage: Language = this.getLanguageByString(FALLBACK_LANGUAGE) || {
        language: "en",
        country: "US",
    };

    private readonly fallbackLanguageObject: LanguageObject = FALLBACK_LANGUAGE_OBJECT as LanguageObject;

    private currentLanguage: Language;
    private currentLanguageObject: LanguageObject;

    public constructor() {
        this.currentLanguage = this.fallbackLanguage;
        this.currentLanguageObject = this.fallbackLanguageObject;

        this.defineCurrentLanguage();
    }

    public getLanguageByString(languageString: string): Language | undefined {
        const parts = languageString.split("-");
        if (parts.length !== 2 || parts[0].length !== 2 || parts[1].length !== 2) {
            console.error(`Language string "${languageString}" do not respect RFC 5646 with language and country code`);
            return undefined;
        }

        return {
            language: parts[0].toLowerCase(),
            country: parts[1].toUpperCase(),
        };
    }

    public getStringByLanguage(language: Language): string | undefined {
        return `${language.language}-${language.country}`;
    }

    public loadCurrentLanguageFile(pluginLoader: Phaser.Loader.LoaderPlugin) {
        const languageString = this.getStringByLanguage(this.currentLanguage);
        pluginLoader.json({
            key: `language-${languageString}`,
            url: `resources/translations/${languageString}.json`,
        });
    }

    public loadCurrentLanguageObject(cacheManager: Phaser.Cache.CacheManager): Promise<void> {
        return new Promise((resolve, reject) => {
            const languageObject: Object = cacheManager.json.get(
                `language-${this.getStringByLanguage(this.currentLanguage)}`
            );

            if (!languageObject) {
                return reject();
            }

            this.currentLanguageObject = languageObject as LanguageObject;
            return resolve();
        });
    }

    public getLanguageWithoutCountry(languageString: string): Language | undefined {
        if (languageString.length !== 2) {
            return undefined;
        }

        let languageFound = undefined;

        const languages: { [key: string]: boolean } = LANGUAGES as { [key: string]: boolean };

        for (const language in languages) {
            if (language.startsWith(languageString) && languages[language]) {
                languageFound = this.getLanguageByString(language);
                break;
            }
        }

        return languageFound;
    }

    private defineCurrentLanguage() {
        const navigatorLanguage: string | undefined = navigator.language;
        const cookieLanguage = getCookie("language");
        let currentLanguage = undefined;

        if (cookieLanguage && typeof cookieLanguage === "string") {
            const cookieLanguageObject = this.getLanguageByString(cookieLanguage);
            if (cookieLanguageObject) {
                currentLanguage = cookieLanguageObject;
            }
        }

        if (!currentLanguage && navigatorLanguage) {
            const navigatorLanguageObject =
                navigator.language.length === 2
                    ? this.getLanguageWithoutCountry(navigatorLanguage)
                    : this.getLanguageByString(navigatorLanguage);
            if (navigatorLanguageObject) {
                currentLanguage = navigatorLanguageObject;
            }
        }

        if (!currentLanguage || currentLanguage === this.fallbackLanguage) {
            return;
        }

        this.currentLanguage = currentLanguage;
    }

    private getObjectValueByPath(path: string, object: LanguageObject): string | undefined {
        const paths = path.split(".");
        let currentValue: LanguageObject | string = object;

        for (const path of paths) {
            if (typeof currentValue === "string" || currentValue[path] === undefined) {
                return undefined;
            }

            currentValue = currentValue[path];
        }

        if (typeof currentValue !== "string") {
            return undefined;
        }

        return currentValue;
    }

    private formatStringWithParams(string: string, params: { [key: string]: string | number }): string {
        let formattedString = string;

        for (const param in params) {
            const regex = `/{{\\s*\\${param}\\s*}}/g`;
            formattedString = formattedString.replace(new RegExp(regex), params[param].toString());
        }

        return formattedString;
    }

    public _(key: string, params?: { [key: string]: string | number }): string {
        const currentLanguageValue = this.getObjectValueByPath(key, this.currentLanguageObject);

        if (currentLanguageValue) {
            return params ? this.formatStringWithParams(currentLanguageValue, params) : currentLanguageValue;
        }

        console.warn(`"${key}" key cannot be found in ${this.getStringByLanguage(this.currentLanguage)} language`);

        const fallbackLanguageValue = this.getObjectValueByPath(key, this.fallbackLanguageObject);

        if (fallbackLanguageValue) {
            return params ? this.formatStringWithParams(fallbackLanguageValue, params) : fallbackLanguageValue;
        }

        console.warn(`"${key}" key cannot be found in ${this.getStringByLanguage(this.fallbackLanguage)} fallback language`);

        return key;
    }
}

export const translator = new Translator();

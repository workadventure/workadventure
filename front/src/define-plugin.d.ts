type LanguageObject = {
    [key: string]: string | boolean | LanguageObject;
};

type LanguageFound = {
    id: string;
    language: string;
    country: string;
    default: boolean;
};

declare const FALLBACK_LANGUAGE_OBJECT: LanguageObject;
declare const LANGUAGES: LanguageFound[];

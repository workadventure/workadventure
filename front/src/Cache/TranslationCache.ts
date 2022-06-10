export interface TranslationCache {
    hash: number;
    translatedText: string;
    fromLanguage: string;
}

export const translationCache: Array<TranslationCache> = new Array();

function hashCode(inputText: string): number {
    let hash = 0;

    if (inputText.length == 0) return hash;

    for (let i: number = 0; i < inputText.length; i++) {
        let char = inputText.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }

    return hash;
}

export const makeHash: Function = function (toLanguage: string, originalText: string): number {
    return hashCode(toLanguage + "_" + originalText);
};

export const hashExists: Function = function (hash: number): boolean {
    for (let i = 0; i < translationCache.length; i++) {
        const el = translationCache[i];
        if (el.hash === hash) {
            return true;
        }
    }
    return false;
};

export const addHash: Function = function (hash: number, fromLanguage: string, translatedText: string) {
    translationCache.push({
        hash: hash,
        translatedText: translatedText,
        fromLanguage: fromLanguage,
    });
};

export const getContentFromHash: Function = function (hash: number): TranslationCache {
    for (let i = 0; i < translationCache.length; i++) {
        const el = translationCache[i];
        if (el.hash === hash) {
            return el;
        }
    }
    throw new Error("The hash " + hash + " does not exists.");
};

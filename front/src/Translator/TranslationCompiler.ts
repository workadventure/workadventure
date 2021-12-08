import fs from "fs";

const translationsBasePath = "./translations";
const fallbackLanguage = process.env.FALLBACK_LANGUAGE || "en-US";

export type LanguageFound = {
    id: string;
    default: boolean;
};

const getAllLanguagesByFiles = (dirPath: string, languages: Array<LanguageFound> | undefined) => {
    const files = fs.readdirSync(dirPath);
    languages = languages || new Array<LanguageFound>();

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            languages = getAllLanguagesByFiles(dirPath + "/" + file, languages);
        } else {
            const parts = file.split(".");

            if (parts.length !== 3 || parts[0] !== "index" || parts[2] !== "json") {
                return;
            }

            const rawData = fs.readFileSync(dirPath + "/" + file, "utf-8");
            const languageObject = JSON.parse(rawData);

            languages?.push({
                id: parts[1],
                default: languageObject.default !== undefined && languageObject.default,
            });
        }
    });

    return languages;
};

const getFallbackLanguageObject = (dirPath: string, languageObject: Object | undefined) => {
    const files = fs.readdirSync(dirPath);
    languageObject = languageObject || {};

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            languageObject = getFallbackLanguageObject(dirPath + "/" + file, languageObject);
        } else {
            const parts = file.split(".");

            if (parts.length !== 3 || parts[1] !== fallbackLanguage || parts[2] !== "json") {
                return;
            }

            const rawData = fs.readFileSync(dirPath + "/" + file, "utf-8");
            languageObject = { ...languageObject, ...JSON.parse(rawData) };
        }
    });

    return languageObject;
};

const languagesToObject = () => {
    const object: { [key: string]: boolean } = {};

    languages.forEach((language) => {
        object[language.id] = false;
    });

    return object;
};

export const languages = getAllLanguagesByFiles(translationsBasePath, undefined);
export const languagesObject = languagesToObject();
export const fallbackLanguageObject = getFallbackLanguageObject(translationsBasePath, undefined);

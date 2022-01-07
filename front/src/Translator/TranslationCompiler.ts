import fs from "fs";

const translationsBasePath = "./translations";
const fallbackLanguage = process.env.FALLBACK_LANGUAGE || "en-US";

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

            if (
                "language" in languageObject && typeof languageObject.language === "string" &&
                "country" in languageObject && typeof languageObject.country === "string" &&
                "default" in languageObject && typeof languageObject.default === "boolean"
            ) {
                languages?.push({
                    id: parts[1],
                    language: languageObject.language,
                    country: languageObject.country,
                    default: languageObject.default
                });
            }
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

export const languages = getAllLanguagesByFiles(translationsBasePath, undefined);
export const fallbackLanguageObject = getFallbackLanguageObject(translationsBasePath, undefined);

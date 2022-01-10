import fs from "fs";
import { z } from "zod";

export type LanguageFound = {
    id: string;
    language: string;
    country: string;
    default: boolean;
};

type LanguageObject = {
    [key: string]: string | boolean | LanguageObject;
};

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

            const indexLanguageObject = z.object({
                language: z.string(),
                country: z.string(),
                default: z.boolean(),
            });

            try {
                const indexLanguage = indexLanguageObject.parse(languageObject);

                languages?.push({
                    id: parts[1],
                    language: indexLanguage.language,
                    country: indexLanguage.country,
                    default: indexLanguage.default,
                });
            } catch (e) {
                console.error(e);
            }
        }
    });

    return languages;
};

const getFallbackLanguageObject = (dirPath: string, languageObject: LanguageObject | undefined) => {
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

            const data = JSON.parse(fs.readFileSync(dirPath + "/" + file, "utf-8"));

            try {
                const languageObjectFormat: z.ZodType<LanguageObject> = z.lazy(() => {
                    return z.object({}).catchall(z.union([z.string(), z.boolean(), languageObjectFormat]));
                });

                const languageObjectData = languageObjectFormat.parse(data);

                languageObject = { ...languageObject, ...languageObjectData };
            } catch (e) {
                console.error(e);
            }
        }
    });

    return languageObject;
};

export const languages = getAllLanguagesByFiles(translationsBasePath, undefined);
export const fallbackLanguageObject = getFallbackLanguageObject(translationsBasePath, undefined);

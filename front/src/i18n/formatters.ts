import type { FormattersInitializer } from "typesafe-i18n";
import type { Locales, Formatters } from "./i18n-types";

// eslint-disable-next-line @typescript-eslint/require-await
export const initFormatters: FormattersInitializer<Locales, Formatters> = async (locale: Locales) => {
    const formatters: Formatters = {
        // add your formatter functions here
    };

    return formatters;
};

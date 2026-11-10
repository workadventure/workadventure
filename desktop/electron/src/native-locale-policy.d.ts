export type NativeLocale =
    | "ar"
    | "ca"
    | "de"
    | "dsb"
    | "en"
    | "es"
    | "fr"
    | "hsb"
    | "it"
    | "ja"
    | "ko"
    | "nl"
    | "pt"
    | "th"
    | "vi"
    | "zh-CN"
    | "zh-TW";

export const NATIVE_LOCALES: NativeLocale[];
export function resolveNativeLocale(appLocale: string): NativeLocale;
export function interpolate(template: string, params?: Record<string, string | number>): string;
export function sanitizeStringTable(payload: unknown): Record<string, string> | undefined;
/** "rtl" or "ltr" for an HTML `dir` attribute, from a language tag such as "ar-SA" or "fr". */
export function textDirection(lang: string): "rtl" | "ltr";

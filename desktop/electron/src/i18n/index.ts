import { app } from "electron";
import { interpolate, resolveNativeLocale, type NativeLocale } from "../native-locale-policy";
import en, { type NativeStringKey, type NativeStrings } from "./en";
import ar from "./ar";
import ca from "./ca";
import de from "./de";
import dsb from "./dsb";
import es from "./es";
import fr from "./fr";
import hsb from "./hsb";
import it from "./it";
import ja from "./ja";
import ko from "./ko";
import nl from "./nl";
import pt from "./pt";
import th from "./th";
import vi from "./vi";
import zhCN from "./zh-CN";
import zhTW from "./zh-TW";

/**
 * Catalog for the native surfaces that have no world behind them (Landing, tab strip, menus, tray,
 * sign-in screens). Keyed by the OS language (app.getLocale()), unlike the companion / meeting bar
 * which receive their strings from the world, in the language chosen in WorkAdventure.
 */
const CATALOGS: Record<NativeLocale, NativeStrings> = {
    ar,
    ca,
    de,
    dsb,
    en,
    es,
    fr,
    hsb,
    it,
    ja,
    ko,
    nl,
    pt,
    th,
    vi,
    "zh-CN": zhCN,
    "zh-TW": zhTW,
};

export type { NativeStringKey };

export function nativeLocale(): NativeLocale {
    return resolveNativeLocale(app.getLocale());
}

export function t(key: NativeStringKey, params?: Record<string, string | number>): string {
    return interpolate(CATALOGS[nativeLocale()][key] ?? en[key], params);
}

/** The strings whose key starts with `prefix` (e.g. "landing."), for a sandboxed native page. */
export function nativeStrings(prefix: string): { lang: string; strings: Record<string, string> } {
    const catalog = CATALOGS[nativeLocale()];
    const strings: Record<string, string> = {};
    for (const key of Object.keys(en) as NativeStringKey[]) {
        if (key.startsWith(prefix)) {
            strings[key] = catalog[key] ?? en[key];
        }
    }
    return { lang: nativeLocale(), strings };
}

import { get } from "svelte/store";
import { locale } from "../../../i18n/i18n-svelte";
import { loadedLocales } from "../../../i18n/i18n-util";
import type { WorkAdventureDesktopApi } from "../../Interfaces/DesktopAppInterfaces";

/**
 * The desktop's companion panel and presenter meeting bar are plain Electron windows with no i18n of
 * their own: they show their strings in the language chosen in WorkAdventure. Push them the
 * `desktop.companion` / `desktop.meetingBar` translations as a flat table ("companion.chat" → "…",
 * plus "lang"), on start and on every language change. The raw dictionary is sent, not LL output:
 * the windows fill the `{placeholders}` themselves.
 */
export function startDesktopStringsBridge(desktop: WorkAdventureDesktopApi): void {
    const setHudStrings = desktop.setHudStrings;
    if (!setHudStrings) {
        return;
    }

    const push = () => {
        const current = get(locale);
        // The store is set only once the dictionary is loaded; empty before the first locale.
        const dictionary = current ? loadedLocales[current] : undefined;
        if (!dictionary) {
            return;
        }
        const strings: Record<string, string> = { lang: current };
        for (const [section, table] of Object.entries({
            companion: dictionary.desktop.companion,
            meetingBar: dictionary.desktop.meetingBar,
        })) {
            for (const [key, value] of Object.entries(table)) {
                if (typeof value === "string") {
                    strings[`${section}.${key}`] = value;
                }
            }
        }
        setHudStrings(strings);
    };

    //eslint-disable-next-line svelte/no-ignored-unsubscribe
    locale.subscribe(push);
    // After a tab switch the shell asks the newly active world to re-sync; its strings may differ.
    desktop.onRequestPresence?.(push);
}

import type { WAMSettings } from "./types";

export class WAMSettingsUtils {
    static getMegaphoneUrl(
        wamSettings: WAMSettings | undefined,
        roomGroup: string | null,
        roomUrl: string
    ): string | undefined {
        if (wamSettings && wamSettings.megaphone && wamSettings.megaphone.enabled && wamSettings.megaphone.scope) {
            let mainURI = roomGroup;
            if (wamSettings.megaphone.scope === "ROOM") {
                mainURI = roomUrl;
            }
            if (!mainURI) {
                throw new Error("Cannot get megaphone url without room url or room group");
            }
            return `${mainURI}/megaphone-${wamSettings.megaphone.title}`
                .replace(/^https?:\/\//, "")
                .replace(/\//g, "-");
        }
        return undefined;
    }
    static canUseMegaphone(wamSettings: WAMSettings | undefined, tags: string[]): boolean {
        if (!wamSettings || !wamSettings.megaphone || !wamSettings.megaphone.enabled) {
            return false;
        }
        const rights = wamSettings.megaphone.rights;
        if (!rights || rights.length === 0) {
            return true;
        }
        return rights.filter((right) => tags.includes(right)).length > 0;
    }

    static canStartRecording(wamSettings: WAMSettings | undefined, tags: string[], isLogged: boolean): boolean {
        if (!isLogged) {
            return false;
        }
        if (tags.includes("admin")) {
            return true;
        }
        const rights = wamSettings?.recording?.rights;
        if (!rights || rights.length === 0) {
            return true;
        }
        return rights.some((right) => tags.includes(right));
    }

    /**
     * Check if the user can start a recording specifically in the megaphone.
     * For this, the user must have both the right to start a recording and the right to use the megaphone.
     */
    static canStartRecordingMegaphone(
        wamSettings: WAMSettings | undefined,
        tags: string[],
        isLogged: boolean
    ): boolean {
        if (tags.includes("admin")) {
            return true;
        }
        if (!this.canStartRecording(wamSettings, tags, isLogged)) {
            return false;
        }
        const rights = wamSettings?.megaphone?.rights;
        if (!rights || rights.length === 0) {
            return true;
        }
        return rights.some((right) => tags.includes(right));
    }
}

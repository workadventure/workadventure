import type { WAMSettings } from "./types";

export class WAMSettingsUtils {
    private static hasMatchingRight(rights: string[] | undefined, tags: string[]): boolean {
        if (!rights || rights.length === 0) {
            return true;
        }
        if (tags.includes("admin")) {
            return true;
        }
        return rights.some((right) => tags.includes(right));
    }

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
        return this.hasMatchingRight(wamSettings.megaphone.rights, tags);
    }

    static canStartRecording(wamSettings: WAMSettings | undefined, tags: string[], isLogged: boolean): boolean {
        if (!isLogged) {
            return false;
        }
        if (tags.includes("admin")) {
            return true;
        }
        return this.hasMatchingRight(wamSettings?.recording?.rights, tags);
    }

    /**
     * Check if the user can start a recording specifically in the megaphone.
     * For this, megaphone recording must be enabled and the user must pass the global recording,
     * megaphone usage and megaphone recording rights.
     */
    static canStartRecordingMegaphone(
        wamSettings: WAMSettings | undefined,
        tags: string[],
        isLogged: boolean
    ): boolean {
        const megaphoneSettings = wamSettings?.megaphone;
        if (!megaphoneSettings?.enabled || megaphoneSettings.recording?.enabled !== true) {
            return false;
        }
        if (!this.canStartRecording(wamSettings, tags, isLogged)) {
            return false;
        }
        if (!this.hasMatchingRight(megaphoneSettings.rights, tags)) {
            return false;
        }
        return this.hasMatchingRight(megaphoneSettings.recording.rights, tags);
    }
}

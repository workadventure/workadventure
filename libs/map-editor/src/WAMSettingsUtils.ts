import { WAMFileFormat } from "./types";

export class WAMSettingsUtils {
    static getMegaphoneUrl(
        wamSettings: WAMFileFormat["settings"],
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
            return `${mainURI}/megaphone`.replace(/^https?:\/\//, "").replace(/\//g, "-");
        }
        return undefined;
    }
    static canUseMegaphone(wamSettings: WAMFileFormat["settings"], tags: string[]): boolean {
        if (!wamSettings || !wamSettings.megaphone || !wamSettings.megaphone.enabled) {
            return false;
        }
        const rights = wamSettings.megaphone.rights;
        if (!rights || rights.length === 0) {
            return true;
        }
        return rights.filter((right) => tags.includes(right)).length > 0;
    }
}

import { coWebsiteManager } from "./CoWebsiteManager";
import { BBBCoWebsite } from "./CoWebsite/BBBCoWebsite";

class BBBFactory {
    private stopped = false;

    public start(clientURL: string) {
        // Check if the meeting was stopped before we received the event
        if (this.isStopped()) {
            return;
        }

        const allowPolicy =
            "microphone *; camera *; display-capture *; clipboard-read *; clipboard-write *; screen-wake-lock *; fullscreen *";
        const coWebsite = new BBBCoWebsite(new URL(clientURL), false, allowPolicy, undefined, false);
        coWebsiteManager.addCoWebsiteToStore(coWebsite, 0);
        coWebsiteManager.loadCoWebsite(coWebsite).catch((e) => console.error(`Error on opening co-website: ${e}`));
    }

    public stop() {
        coWebsiteManager.getCoWebsites().forEach((coWebsite) => {
            if (coWebsite instanceof BBBCoWebsite) {
                coWebsiteManager.closeCoWebsite(coWebsite);
            }
        });
    }

    public isStopped(): boolean {
        return this.stopped;
    }

    public setStopped(stopped: boolean) {
        this.stopped = stopped;
    }

    /* Hashes a string with domain, instance and meetingId to get a unique
       meetingId for different server configurations without needing to edit
       bbbMeeting in the map properties.
    */
    public parametrizeMeetingId(meetingId: string) {
        const encoder = new TextEncoder();
        const domain = window.location.host;

        const match = /\/[_@]\/([^/]+)\//.exec(window.location.pathname);
        const instance = match?.[1] || "";

        const parametrizedMeetingId = domain + "/" + instance + "/" + meetingId;
        const encodedMeetingId = encoder.encode(parametrizedMeetingId);

        return crypto.subtle.digest("SHA-256", encodedMeetingId).then((hashBuffer) => {
            const hashedMeetingId = Array.from(new Uint8Array(hashBuffer))
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
            return hashedMeetingId;
        });
    }
}

export const bbbFactory = new BBBFactory();

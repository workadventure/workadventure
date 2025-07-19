import { SimpleCoWebsite } from "./SimpleCoWebsite";
import { CoWebsite } from "./CoWebsite";

export class GoogleMeetCoWebsite extends SimpleCoWebsite {
    constructor(url: URL, widthPercent?: number, closable?: boolean) {
        // Remove all other Google Meet coWebsites
        // Note: this is a bit of a hack. We should have a better way to manage this.
        // Maybe a "group" of coWebsites?
        for (const coWebsite of coWebsites.get()) {
            if (coWebsite instanceof GoogleMeetCoWebsite) {
                coWebsites.remove(coWebsite);
            }
        }

        super(url, false, undefined, widthPercent, closable);
        this.id = "google-meet-" + this.id;
    }
}

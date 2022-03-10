import { coWebsiteManager } from "./CoWebsiteManager";
import { BBBCoWebsite } from "./CoWebsite/BBBCoWebsite";

class BBBFactory {
    private stopped: boolean = false;

    public start(clientURL: string) {
        // Check if the meeting was stopped before we received the event
        if (this.isStopped()) {
            return;
        }

        const allowPolicy =
            "microphone *; " + "camera *; " + "display-capture *; " + "clipboard-read *; " + "clipboard-write *;";
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
}

export const bbbFactory = new BBBFactory();

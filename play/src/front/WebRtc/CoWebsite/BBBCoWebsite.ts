import type CancelablePromise from "cancelable-promise";
import { inExternalServiceStore } from "../../Stores/MyMediaStore";
import { screenWakeLock } from "../../Utils/ScreenWakeLock";
import { coWebsiteManager } from "../CoWebsiteManager";
import { SimpleCoWebsite } from "./SimpleCoWebsite";

export class BBBCoWebsite extends SimpleCoWebsite {
    constructor(url: URL, allowApi?: boolean, allowPolicy?: string, widthPercent?: number, closable?: boolean) {
        coWebsiteManager.getCoWebsites().forEach((coWebsite) => {
            if (coWebsite instanceof BBBCoWebsite) {
                coWebsiteManager.closeCoWebsite(coWebsite);
            }
        });

        super(url, allowApi, allowPolicy, widthPercent, closable);
        this.id = "bbb-meeting-" + this.id;
    }

    load(): CancelablePromise<HTMLIFrameElement> {
        screenWakeLock.requestWakeLock().catch((error) => console.error(error));
        inExternalServiceStore.set(true);
        return super.load();
    }

    unload(): Promise<void> {
        screenWakeLock.releaseWakeLock().catch((error) => console.error(error));
        inExternalServiceStore.set(false);

        return super.unload();
    }
}

import type CancelablePromise from "cancelable-promise";
import { gameManager } from "../../Phaser/Game/GameManager";
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
        gameManager.getCurrentGameScene().disableMediaBehaviors();
        return super.load();
    }

    unload(): Promise<void> {
        gameManager.getCurrentGameScene().enableMediaBehaviors();

        return super.unload();
    }
}

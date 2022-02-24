import { coWebsiteManager } from "../CoWebsiteManager";
import { SimpleCoWebsite } from "./SimpleCoWebsite";

export class BBBCoWebsite extends SimpleCoWebsite {

    constructor(url: URL, allowApi?: boolean, allowPolicy?: string, widthPercent?: number, closable?: boolean) {
        const coWebsite = coWebsiteManager.searchBBB();

        if (coWebsite) {
            coWebsiteManager.closeCoWebsite(coWebsite);
        }

        super(url, allowApi, allowPolicy, widthPercent, closable);
        this.id = "bbb-meeting-" + this.id;
    }
}

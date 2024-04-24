import { coWebsiteManager } from "../../Stores/CoWebsiteStore";
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
}

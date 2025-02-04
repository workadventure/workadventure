import { coWebsites } from "../../Stores/CoWebsiteStore";
import { SimpleCoWebsite } from "./SimpleCoWebsite";

export class BBBCoWebsite extends SimpleCoWebsite {
    constructor(url: URL, allowApi?: boolean, allowPolicy?: string, widthPercent?: number, closable?: boolean) {
        // Remove all other BBB coWebsites
        coWebsites.keepOnly((coWebsite) => !(coWebsite instanceof BBBCoWebsite));

        super(url, allowApi, allowPolicy, widthPercent, closable);
        this.id = "bbb-meeting-" + this.id;
    }
}

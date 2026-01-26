import { get } from "svelte/store";
import { coWebsites } from "../../Stores/CoWebsiteStore";
import LL from "../../../i18n/i18n-svelte";
import meetingIcon from "../../Components/images/meeting.svg";
import { SimpleCoWebsite } from "./SimpleCoWebsite";

export class BBBCoWebsite extends SimpleCoWebsite {
    constructor(
        url: URL,
        allowApi?: boolean,
        allowPolicy?: string,
        widthPercent?: number,
        closable?: boolean,
        hideUrl?: boolean
    ) {
        // Remove all other BBB coWebsites
        coWebsites.keepOnly((coWebsite) => !(coWebsite instanceof BBBCoWebsite));

        super(url, allowApi, allowPolicy, widthPercent, closable, hideUrl);
        this.id = "bbb-meeting-" + this.id;
    }

    public getTitle(): string {
        return get(LL).cowebsite.bigBlueButton();
    }

    public getIcon(): string {
        return meetingIcon;
    }
}

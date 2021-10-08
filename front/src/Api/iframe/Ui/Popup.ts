import { sendToWorkadventure } from "../IframeApiContribution";
import type { ClosePopupEvent } from "../../Events/ClosePopupEvent";

export class Popup {
    constructor(private id: number) {}

    /**
     * Closes the popup
     */
    public close(): void {
        sendToWorkadventure({
            type: "closePopup",
            data: {
                popupId: this.id,
            } as ClosePopupEvent,
        });
    }
}

import { sendToWorkadventure } from "../IframeApiContribution";

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
            },
        });
    }
}

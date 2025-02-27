import { sendToWorkadventure } from "../IframeApiContribution";

export class Menu {
    constructor(private key: string) {}

    /**
     * remove the menu
     */
    public remove(): void {
        sendToWorkadventure({
            type: "unregisterMenu",
            data: {
                key: this.key,
            },
        });
    }

    /**
     * Programmatically open the menu (only works if the menu has been defined with the "iframe" property)
     */
    public open(): void {
        sendToWorkadventure({
            type: "openMenu",
            data: {
                key: this.key,
            },
        });
    }
}

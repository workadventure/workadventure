import { sendToWorkadventure } from "../IframeApiContribution";

export class Menu {
    constructor(private menuName: string) {}

    /**
     * remove the menu
     */
    public remove() {
        sendToWorkadventure({
            type: "unregisterMenu",
            data: {
                name: this.menuName,
            },
        });
    }
}

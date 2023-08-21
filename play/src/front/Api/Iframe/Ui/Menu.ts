import { sendToWorkadventure } from "../IframeApiContribution";
import { MenuOptions } from "../ui";

export class Menu {
    constructor(private menuName: string, private options: MenuOptions) {}

    /**
     * remove the menu
     */
    public remove(): void {
        sendToWorkadventure({
            type: "unregisterMenu",
            data: {
                name: this.menuName,
            },
        });
    }

    /**
     * Programmatically open the menu
     */
    public open(): void {
        if (this.options.callback) {
            this.options.callback(this.menuName);
        }
        if (this.options.iframe) {
            sendToWorkadventure({
                type: "openMenu",
                data: {
                    name: this.menuName,
                },
            });
        }
    }
}

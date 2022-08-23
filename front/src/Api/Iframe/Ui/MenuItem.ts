import type { MenuItemClickedEvent } from "../../Events/Ui/MenuItemClickedEvent";
import { iframeListener } from "../../IframeListener";

export function sendMenuClickedEvent(menuItem: string) {
    iframeListener.postMessage({
        type: "menuItemClicked",
        data: {
            menuItem: menuItem,
        } as MenuItemClickedEvent,
    });
}

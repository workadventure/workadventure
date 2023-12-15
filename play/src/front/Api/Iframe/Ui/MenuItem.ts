import type { MenuItemClickedEvent } from "../../Events/Ui/MenuItemClickedEvent";
import { iframeListener } from "../../IframeListener";

export function sendMenuClickedEvent(menuItemKey: string) {
    iframeListener.postMessage({
        type: "menuItemClicked",
        data: {
            menuItem: menuItemKey,
        } as MenuItemClickedEvent,
    });
}

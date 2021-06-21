import * as tg from "generic-type-guard";
import { iframeListener } from '../../IframeListener';

export const isMenuItemClickedEvent =
    new tg.IsInterface().withProperties({
        menuItem: tg.isString
    }).get();
/**
 * A message sent from the game to the iFrame when a menu item is clicked.
 */
export type MenuItemClickedEvent = tg.GuardedType<typeof isMenuItemClickedEvent>;


export function sendMenuClickedEvent(menuItem: string) {
    iframeListener.postMessage({
        'type': 'menuItemClicked',
        'data': {
            menuItem: menuItem,
        } as MenuItemClickedEvent
    });
}
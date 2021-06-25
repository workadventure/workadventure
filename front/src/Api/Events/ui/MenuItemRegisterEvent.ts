import * as tg from "generic-type-guard";
import { Subject } from 'rxjs';

export const isMenuItemRegisterEvent =
    new tg.IsInterface().withProperties({
        menutItem: tg.isString
    }).get();
/**
 * A message sent from the iFrame to the game to add a new menu item.
 */
export type MenuItemRegisterEvent = tg.GuardedType<typeof isMenuItemRegisterEvent>;

export const isMenuItemRegisterIframeEvent =
    new tg.IsInterface().withProperties({
        type: tg.isSingletonString("registerMenuCommand"),
        data: isMenuItemRegisterEvent
    }).get();


const _registerMenuCommandStream: Subject<string> = new Subject();
export const registerMenuCommandStream = _registerMenuCommandStream.asObservable();

export function handleMenuItemRegistrationEvent(event: MenuItemRegisterEvent) {
    _registerMenuCommandStream.next(event.menutItem)
}
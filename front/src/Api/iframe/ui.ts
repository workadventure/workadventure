import { isButtonClickedEvent } from "../Events/ButtonClickedEvent";
import { isMenuItemClickedEvent } from "../Events/ui/MenuItemClickedEvent";
import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";
import type { ButtonClickedCallback, ButtonDescriptor } from "./Ui/ButtonDescriptor";
import { Popup } from "./Ui/Popup";
import { ActionMessage } from "./Ui/ActionMessage";
import { isMessageReferenceEvent } from "../Events/ui/TriggerActionMessageEvent";
import { Menu } from "./Ui/Menu";
import type { RequireOnlyOne } from "../types";

let popupId = 0;
const popups: Map<number, Popup> = new Map<number, Popup>();
const popupCallbacks: Map<number, Map<number, ButtonClickedCallback>> = new Map<
    number,
    Map<number, ButtonClickedCallback>
>();

const menus: Map<string, Menu> = new Map<string, Menu>();
const menuCallbacks: Map<string, (command: string) => void> = new Map();
const actionMessages = new Map<string, ActionMessage>();

interface MenuDescriptor {
    callback?: (commandDescriptor: string) => void;
    iframe?: string;
    allowApi?: boolean;
}

export type MenuOptions = RequireOnlyOne<MenuDescriptor, "callback" | "iframe">;

interface ZonedPopupOptions {
    zone: string;
    objectLayerName?: string;
    popupText: string;
    delay?: number;
    popupOptions: Array<ButtonDescriptor>;
}

export interface ActionMessageOptions {
    message: string;
    type?: "message" | "warning";
    callback: () => void;
}

export class WorkAdventureUiCommands extends IframeApiContribution<WorkAdventureUiCommands> {
    callbacks = [
        apiCallback({
            type: "buttonClickedEvent",
            typeChecker: isButtonClickedEvent,
            callback: (payloadData) => {
                const callback = popupCallbacks.get(payloadData.popupId)?.get(payloadData.buttonId);
                const popup = popups.get(payloadData.popupId);
                if (popup === undefined) {
                    throw new Error('Could not find popup with ID "' + payloadData.popupId + '"');
                }
                if (callback) {
                    callback(popup);
                }
            },
        }),
        apiCallback({
            type: "menuItemClicked",
            typeChecker: isMenuItemClickedEvent,
            callback: (event) => {
                const callback = menuCallbacks.get(event.menuItem);
                const menu = menus.get(event.menuItem);
                if (menu === undefined) {
                    throw new Error('Could not find menu named "' + event.menuItem + '"');
                }
                if (callback) {
                    callback(event.menuItem);
                }
            },
        }),
        apiCallback({
            type: "messageTriggered",
            typeChecker: isMessageReferenceEvent,
            callback: (event) => {
                const actionMessage = actionMessages.get(event.uuid);
                if (actionMessage) {
                    actionMessage.triggerCallback();
                }
            },
        }),
    ];

    openPopup(targetObject: string, message: string, buttons: ButtonDescriptor[]): Popup {
        popupId++;
        const popup = new Popup(popupId);
        const btnMap = new Map<number, () => void>();
        popupCallbacks.set(popupId, btnMap);
        let id = 0;
        for (const button of buttons) {
            const callback = button.callback;
            if (callback) {
                btnMap.set(id, () => {
                    callback(popup);
                });
            }
            id++;
        }

        sendToWorkadventure({
            type: "openPopup",
            data: {
                popupId,
                targetObject,
                message,
                buttons: buttons.map((button) => {
                    return {
                        label: button.label,
                        className: button.className,
                    };
                }),
            },
        });

        popups.set(popupId, popup);
        return popup;
    }

    registerMenuCommand(commandDescriptor: string, options: MenuOptions | ((commandDescriptor: string) => void)): Menu {
        const menu = new Menu(commandDescriptor);

        if (typeof options === "function") {
            menuCallbacks.set(commandDescriptor, options);
            sendToWorkadventure({
                type: "registerMenu",
                data: {
                    name: commandDescriptor,
                    options: {
                        allowApi: false,
                    },
                },
            });
        } else {
            options.allowApi = options.allowApi === undefined ? options.iframe !== undefined : options.allowApi;

            if (options.iframe !== undefined) {
                sendToWorkadventure({
                    type: "registerMenu",
                    data: {
                        name: commandDescriptor,
                        iframe: options.iframe,
                        options: {
                            allowApi: options.allowApi,
                        },
                    },
                });
            } else if (options.callback !== undefined) {
                menuCallbacks.set(commandDescriptor, options.callback);
                sendToWorkadventure({
                    type: "registerMenu",
                    data: {
                        name: commandDescriptor,
                        options: {
                            allowApi: options.allowApi,
                        },
                    },
                });
            } else {
                throw new Error(
                    "When adding a menu with WA.ui.registerMenuCommand, you must pass either an iframe or a callback"
                );
            }
        }
        menus.set(commandDescriptor, menu);
        return menu;
    }

    displayBubble(): void {
        sendToWorkadventure({ type: "displayBubble", data: null });
    }

    removeBubble(): void {
        sendToWorkadventure({ type: "removeBubble", data: null });
    }

    displayActionMessage(actionMessageOptions: ActionMessageOptions): ActionMessage {
        const actionMessage = new ActionMessage(actionMessageOptions, () => {
            actionMessages.delete(actionMessage.uuid);
        });
        actionMessages.set(actionMessage.uuid, actionMessage);
        return actionMessage;
    }
}

export default new WorkAdventureUiCommands();

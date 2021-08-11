import { isButtonClickedEvent } from "../Events/ButtonClickedEvent";
import { isMenuItemClickedEvent } from "../Events/ui/MenuItemClickedEvent";
import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";
import type { ButtonClickedCallback, ButtonDescriptor } from "./Ui/ButtonDescriptor";
import { Popup } from "./Ui/Popup";
import { ActionMessage } from "./Ui/ActionMessage";
import { isMessageReferenceEvent } from "../Events/ui/TriggerActionMessageEvent";

let popupId = 0;
const popups: Map<number, Popup> = new Map<number, Popup>();
const popupCallbacks: Map<number, Map<number, ButtonClickedCallback>> = new Map<
    number,
    Map<number, ButtonClickedCallback>
>();

const menuCallbacks: Map<string, (command: string) => void> = new Map();
const actionMessages = new Map<string, ActionMessage>();

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
                console.log("BOUM : " + event.menuItem);
                const callback = menuCallbacks.get(event.menuItem);
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

    registerMenuCommand(commandDescriptor: string, callback: (commandDescriptor: string) => void) {
        menuCallbacks.set(commandDescriptor, callback);
        sendToWorkadventure({
            type: "registerMenuCommand",
            data: {
                menutItem: commandDescriptor,
            },
        });
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

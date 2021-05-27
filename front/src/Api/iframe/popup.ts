import { isButtonClickedEvent } from '../Events/ButtonClickedEvent';
import { ClosePopupEvent } from '../Events/ClosePopupEvent';
import { apiCallback, IframeApiContribution, IframeCallbackContribution, sendToWorkadventure } from './IframeApiContribution';
import zoneCommands from "./zone-events"
class Popup {
    constructor(private id: number) {
    }

    /**
     * Closes the popup
     */
    public close(): void {
        window.parent.postMessage({
            'type': 'closePopup',
            'data': {
                'popupId': this.id,
            } as ClosePopupEvent
        }, '*');
    }
}

type ButtonClickedCallback = (popup: Popup) => void;
interface ButtonDescriptor {
    /**
     * The label of the button
     */
    label: string,
    /**
     * The type of the button. Can be one of "normal", "primary", "success", "warning", "error", "disabled"
     */
    className?: "normal" | "primary" | "success" | "warning" | "error" | "disabled",
    /**
     * Callback called if the button is pressed
     */
    callback: ButtonClickedCallback,
}
let popupId = 0;
const popups: Map<number, Popup> = new Map<number, Popup>();
const popupCallbacks: Map<number, Map<number, ButtonClickedCallback>> = new Map<number, Map<number, ButtonClickedCallback>>();

interface ZonedPopupOptions {
    zone: string
    objectLayerName?: string,
    popupText: string,
    delay?: number
    popupOptions: Array<ButtonDescriptor>
}


class PopupApiContribution extends IframeApiContribution<PopupApiContribution> {

    readonly subObjectIdentifier = "ui"

    readonly addMethodsAtRoot = true
    callbacks = [apiCallback({
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
        }
    })];


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
            'type': 'openPopup',
            'data': {
                popupId,
                targetObject,
                message,
                buttons: buttons.map((button) => {
                    return {
                        label: button.label,
                        className: button.className
                    };
                })
            }
        });

        popups.set(popupId, popup)
        return popup;
    }



    popupInZone(options: ZonedPopupOptions) {
        const objectLayerName = options.objectLayerName || options.zone

        let lastOpened = 0;

        let popup: Popup | undefined;
        zoneCommands.onEnterZone(options.zone, () => {
            if (options.delay) {
                if (lastOpened + options.delay > Date.now()) {
                    return;
                }
            }
            lastOpened = Date.now();
            popup = this.openPopup(objectLayerName, options.popupText, options.popupOptions.map(option => {
                const callback = option.callback;
                const popupOptions = {
                    ...option,
                    className: option.className || 'normal',
                    callback: () => {
                        if (callback && popup) {
                            callback(popup);
                        }
                        popup?.close();
                        popup = undefined;
                    }
                };

                return popupOptions;
            }));
        });
        zoneCommands.onLeaveZone(options.zone, () => {
            if (popup) {
                popup.close();
                popup = undefined;
            }
        });
    }

}

export default new PopupApiContribution()
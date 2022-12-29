import { AddButtonActionBarEvent } from "../../Events/Ui/ButtonActionBarEvent";
import { IframeApiContribution, sendToWorkadventure } from "../IframeApiContribution";
import { apiCallback } from "../registeredCallbacks";

export type ButtonActionBarClickedCallback = (buttonActionBar: AddButtonActionBarEvent) => void;

enum ActionBarButtonType {
    button = "button",
    action = "action",
}

export type ActionBarButtonDescriptor = {
    id: string;
    label: string;
    type: ActionBarButtonType;
    imageSrc?: string;
    toolTip?: string;
    callback?: ButtonActionBarClickedCallback;
};

export class WorkAdventureButtonActionBarCommands extends IframeApiContribution<WorkAdventureButtonActionBarCommands> {
    private _callbacks: Map<string, ButtonActionBarClickedCallback> = new Map<string, ButtonActionBarClickedCallback>();

    callbacks = [
        apiCallback({
            type: "buttonActionBarTrigger",
            callback: (event) => {
                if (this._callbacks.has(event.id)) {
                    (this._callbacks.get(event.id) as ButtonActionBarClickedCallback)(event);
                }
            },
        }),
    ];

    /**
     * Add action bar button
     * {@link http://workadventure.localhost/map-building/api-ui.md#add-action-bar | Website documentation}
     */
    addButton(descriptor: ActionBarButtonDescriptor) {
        if (descriptor.callback != undefined) {
            this._callbacks.set(descriptor.id, descriptor.callback);
        }
        sendToWorkadventure({
            type: "addButtonActionBar",
            data: {
                id: descriptor.id,
                label: descriptor.label,
                type: descriptor.type,
                imageSrc: descriptor.imageSrc,
                toolTip: descriptor.toolTip,
            },
        });
    }

    /**
     * Remove action bar button
     * {@link http://workadventure.localhost/map-building/api-ui.md#remove-action-bar | Website documentation}
     */
    removeButton(id: string) {
        this._callbacks.delete(id);
        sendToWorkadventure({ type: "removeButtonActionBar", data: { id } });
    }
}

export default new WorkAdventureButtonActionBarCommands();

import {
    AddButtonActionBarEvent,
    isAddClassicButtonActionBarEvent,
    isAddActionButtonActionBarEvent,
} from "../../Events/Ui/ButtonActionBarEvent";
import { IframeApiContribution, sendToWorkadventure } from "../IframeApiContribution";
import { apiCallback } from "../registeredCallbacks";

export type ButtonActionBarClickedCallback = (buttonActionBar: AddButtonActionBarEvent) => void;

const ActionBarButtonType = {
    button: "button",
    action: "action",
} as const;
type ActionBarButtonType = (typeof ActionBarButtonType)[keyof typeof ActionBarButtonType];

export type ActionBarClassicButtonDescriptor = {
    id: string;
    label: string;
    type?: ActionBarButtonType;
    callback?: ButtonActionBarClickedCallback;
};

export type ActionBarActionButtonDescriptor = {
    id: string;
    type: ActionBarButtonType;
    imageSrc: string;
    toolTip: string;
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
    addButton(descriptor: ActionBarClassicButtonDescriptor | ActionBarActionButtonDescriptor) {
        if (descriptor.callback != undefined) {
            this._callbacks.set(descriptor.id, descriptor.callback);
        }

        const addClassicButtonActionBar = isAddClassicButtonActionBarEvent.safeParse(descriptor);
        if (addClassicButtonActionBar.success && addClassicButtonActionBar.data.type === "button") {
            sendToWorkadventure({
                type: "addButtonActionBar",
                data: {
                    id: addClassicButtonActionBar.data.id,
                    label: addClassicButtonActionBar.data.label,
                    type: addClassicButtonActionBar.data.type,
                },
            });
        }

        const addActionButtonActionBarEvent = isAddActionButtonActionBarEvent.safeParse(descriptor);
        if (addActionButtonActionBarEvent.success && addActionButtonActionBarEvent.data.type === "action") {
            sendToWorkadventure({
                type: "addButtonActionBar",
                data: {
                    id: addActionButtonActionBarEvent.data.id,
                    type: addActionButtonActionBarEvent.data.type,
                    imageSrc: addActionButtonActionBarEvent.data.imageSrc,
                    toolTip: addActionButtonActionBarEvent.data.toolTip,
                },
            });
        }
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

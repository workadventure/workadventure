import { AddButtonActionBarEvent, isAddActionBarButtonEvent } from "../../Events/Ui/ButtonActionBarEvent";
import { IframeApiContribution, sendToWorkadventure } from "../IframeApiContribution";
import { apiCallback } from "../registeredCallbacks";

export type ButtonActionBarClickedCallback = (buttonActionBar: AddButtonActionBarEvent) => void;

export type ActionBarButtonDescriptor = AddButtonActionBarEvent & {
    callback?: ButtonActionBarClickedCallback;
};

export class WorkAdventureButtonActionBarCommands extends IframeApiContribution<WorkAdventureButtonActionBarCommands> {
    private _callbacks: Map<string, () => void> = new Map<string, () => void>();

    callbacks = [
        apiCallback({
            type: "buttonActionBarTriggered",
            callback: (id) => {
                this._callbacks.get(id)?.();
            },
        }),
    ];

    /**
     * Add action bar button
     * {@link http://workadventure.localhost/map-building/api-ui.md#add-action-bar | Website documentation}
     */
    addButton(descriptor: ActionBarButtonDescriptor) {
        const addClassicButtonActionBar = isAddActionBarButtonEvent.safeParse(descriptor);
        if (addClassicButtonActionBar.success) {
            if (descriptor.callback != undefined) {
                this._callbacks.set(descriptor.id, () => descriptor.callback?.(addClassicButtonActionBar.data));
            }
            sendToWorkadventure({
                type: "addButtonActionBar",
                data: {
                    id: addClassicButtonActionBar.data.id,
                    label: addClassicButtonActionBar.data.label,
                    isGradient: addClassicButtonActionBar.data.isGradient,
                    imageSrc: addClassicButtonActionBar.data.imageSrc,
                    toolTip: addClassicButtonActionBar.data.toolTip,
                    bgColor: addClassicButtonActionBar.data.bgColor,
                    textColor: addClassicButtonActionBar.data.textColor,
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

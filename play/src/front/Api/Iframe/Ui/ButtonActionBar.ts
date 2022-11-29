import { sendToWorkadventure } from "../IframeApiContribution";

export type ButtonActionBarClickedCallback = () => void;

export interface ButtonActionBar {
    id: string;
    /**
     * The label of the button
     */
    label: string;
    /**
     * Callback called if the button is pressed
     */
    callback?: ButtonActionBarClickedCallback;
}

export class WorkAdventureButtonActionBarCommands {
    addButtonActionBar(id: string, label: string, callback?: ButtonActionBarClickedCallback) {
        sendToWorkadventure({
            type: "addButtonActionBar",
            data: {
                id,
                label,
                callback,
            },
        });
    }

    removeButtonActionBar(id: string) {
        sendToWorkadventure({ type: "removeButtonActionBar", data: { id } });
    }
}

export default new WorkAdventureButtonActionBarCommands();

import { IframeApiContribution, sendToWorkadventure } from "../IframeApiContribution";
import type { ModalEvent } from "../../Events/ModalEvent";
import { apiCallback } from "../registeredCallbacks";

export class WorkadventureModalCommands extends IframeApiContribution<WorkadventureModalCommands> {
    private _closeCallback?: (arg: ModalEvent) => void;

    callbacks = [
        apiCallback({
            type: "modalCloseTrigger",
            callback: (event) => {
                if (this._closeCallback) {
                    this._closeCallback(event);
                }
            },
        }),
    ];

    /**
     * Open instantly the modal window.
     * {@link https://workadventu.re/map-building/api-chat.md#open-the-modal-window | Website documentation}
     */
    openModal(modalEvent: ModalEvent, closeCallback?: (arg: ModalEvent) => void): void {
        this._closeCallback = closeCallback;
        sendToWorkadventure({ type: "openModal", data: modalEvent });
    }

    /**
     * Close instantly the modal window.
     * {@link https://workadventu.re/map-building/api-chat.md#close-the-modal-window | Website documentation}
     */
    closeModal(): void {
        this._closeCallback = undefined;
        sendToWorkadventure({ type: "closeModal", data: undefined });
    }
}

export default new WorkadventureModalCommands();

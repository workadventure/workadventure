import { IframeApiContribution, sendToWorkadventure } from "../IframeApiContribution";
import type { ModalEvent } from "../../Events/ModalEvent";

export class WorkadventureModalCommands extends IframeApiContribution<WorkadventureModalCommands> {
    callbacks = [];

    /**
     * Open instantly the chat window.
     * {@link https://workadventu.re/map-building/api-chat.md#open-the-modal-window | Website documentation}
     */
    openModal(modalEvent: ModalEvent): void {
        sendToWorkadventure({ type: "openModal", data: modalEvent });
    }

    /**
     * Close instantly the chat window.
     * {@link https://workadventu.re/map-building/api-chat.md#close-the-modal-window | Website documentation}
     */
    closeModal(): void {
        sendToWorkadventure({ type: "closeModal", data: undefined });
    }
}

export default new WorkadventureModalCommands();

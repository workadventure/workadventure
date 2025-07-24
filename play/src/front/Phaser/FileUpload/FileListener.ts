import { FILE_UPLOAD_SUPPORTED_FORMATS_FRONT } from "@workadventure/map-editor";
import { get } from "svelte/store";
import { draggingFile } from "../../Stores/FileUploadStore";
import { popupStore } from "../../Stores/PopupStore";
import PopUpDropFileEntity from "../../Components/PopUp/PopUpDropFileEntity.svelte";
import { gameManager } from "../Game/GameManager";
import { warningMessageStore } from "../../Stores/ErrorStore";
import { userIsConnected } from "../../Stores/MenuStore";
import PopUpConnect from "../../Components/PopUp/PopUpConnect.svelte";

export class FileListener {
    private canvas: HTMLCanvasElement;

    private boundDragOverHandler: (event: DragEvent) => void;
    private boundDragLeaveHandler: (event: DragEvent) => void;
    private boundDragEnterHandler: (event: DragEvent) => void;
    private boundDropHandler: (event: DragEvent) => void;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        this.boundDragOverHandler = this.dragOverHandler.bind(this);
        this.boundDragLeaveHandler = this.dragLeaveHandler.bind(this);
        this.boundDragEnterHandler = this.dragEnterHandler.bind(this);
        this.boundDropHandler = this.dropHandler.bind(this);
    }

    public initDomListeners() {
        this.canvas.addEventListener("dragover", this.boundDragOverHandler);
        this.canvas.addEventListener("dragleave", this.boundDragLeaveHandler);
        this.canvas.addEventListener("dragenter", this.boundDragEnterHandler);
        this.canvas.addEventListener("dragend", this.boundDragLeaveHandler);
        this.canvas.addEventListener("drop", this.boundDropHandler);
    }

    public close() {
        this.canvas.removeEventListener("dragover", this.boundDragOverHandler);
        this.canvas.removeEventListener("dragleave", this.boundDragLeaveHandler);
        this.canvas.removeEventListener("dragenter", this.boundDragEnterHandler);
        this.canvas.removeEventListener("dragend", this.boundDragLeaveHandler);
        this.canvas.removeEventListener("drop", this.boundDropHandler);
    }

    public dropHandler(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();

        const userIsAdmin = gameManager.getCurrentGameScene().connection?.isAdmin();
        const userIsEditor = gameManager.getCurrentGameScene().connection?.hasTag("editor");

        if (!get(userIsConnected)) {
            popupStore.addPopup(
                PopUpConnect,
                {
                    message: "You can't upload files if you are not logged in and don't have the rights to do so.",
                },
                "popupConnect"
            );
            draggingFile.set(false);
            return;
        }

        if (!userIsAdmin && !userIsEditor) {
            warningMessageStore.addWarningMessage("You do not have the rights to upload files on this map", {
                closable: true,
            });
            draggingFile.set(false);
            return;
        }

        const { files: filesFromDropEvent } = event.dataTransfer ?? {};
        if (filesFromDropEvent) {
            if (filesFromDropEvent.length > 1) {
                warningMessageStore.addWarningMessage("Only one file is permitted", { closable: true });
            } else {
                const file = filesFromDropEvent.item(0);
                if (this.isASupportedFormat(file?.type ?? "")) {
                    if (file) {
                        popupStore.addPopup(
                            PopUpDropFileEntity,
                            {
                                file: file,
                            },
                            "popupDropFileEntity"
                        );
                    }
                } else {
                    console.error("File format not supported", file?.type);
                    warningMessageStore.addWarningMessage("File format not supported", { closable: true });
                }
            }
        }

        draggingFile.set(false);
    }

    private dragEnterHandler(event: DragEvent) {
        event.preventDefault();

        draggingFile.set(true);
    }

    private dragOverHandler(event: DragEvent) {
        event.preventDefault();

        draggingFile.set(true);
    }

    private dragLeaveHandler(event: DragEvent) {
        event.preventDefault();

        draggingFile.set(false);
    }

    private isASupportedFormat(format: string): boolean {
        return format.trim().length > 0 && FILE_UPLOAD_SUPPORTED_FORMATS_FRONT.includes(format);
    }
}

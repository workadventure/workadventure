import { FILE_UPLOAD_SUPPORTED_FORMATS_FRONT } from "@workadventure/map-editor";
import { draggingFile } from "../../Stores/FileUploadStore";
import { popupStore } from "../../Stores/PopupStore";
import PopupDropFileEntity from "../../Components/PopUp/PopupDropFileEntity.svelte";

export class FileListener {
    private canvas: HTMLCanvasElement;
    private dragCounter = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    public initDomListeners() {
        this.canvas.addEventListener("dragover", this.dragOverHandler.bind(this));
        this.canvas.addEventListener("dragleave", this.dragLeaveHandler.bind(this));
        this.canvas.addEventListener("dragenter", this.dragEnterHandler.bind(this));
        this.canvas.addEventListener("dragend", this.dragLeaveHandler.bind(this));
        this.canvas.addEventListener("drop", this.dropHandler.bind(this));
    }

    public close() {
        this.canvas.removeEventListener("dragover", this.dragOverHandler.bind(this));
        this.canvas.removeEventListener("dragleave", this.dragLeaveHandler.bind(this));
        this.canvas.removeEventListener("dragenter", this.dragEnterHandler.bind(this));
        this.canvas.removeEventListener("dragend", this.dragLeaveHandler.bind(this));
        this.canvas.removeEventListener("drop", this.dropHandler.bind(this));
    }

    public dropHandler(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();

        // TODO: add a check to see if the user is allowed to drop files

        const { files: filesFromDropEvent } = event.dataTransfer ?? {};
        if (filesFromDropEvent) {
            if (filesFromDropEvent.length > 1) {
                console.error("Only one file is permitted");
            } else {
                const file = filesFromDropEvent.item(0);
                if (this.isASupportedFormat(file?.type ?? "")) {
                    if (file) {
                        popupStore.addPopup(
                            PopupDropFileEntity,
                            {
                                file: file,
                            },
                            "popupDropFileEntity"
                        );
                    }
                } else {
                    console.log("File format not supported", file?.type);
                    console.error("File format not supported");
                }
            }
        }

        draggingFile.set(false);
    }

    private dragEnterHandler(event: DragEvent) {
        event.preventDefault();
        this.dragCounter++;

        draggingFile.set(true);
    }

    private dragOverHandler(event: DragEvent) {
        event.preventDefault();

        draggingFile.set(true);
    }

    private dragLeaveHandler() {
        this.dragCounter--;
        if (this.dragCounter === 0) {
            draggingFile.set(false);
        }

        draggingFile.set(false);
    }

    private isASupportedFormat(format: string): boolean {
        return format.trim().length > 0 && FILE_UPLOAD_SUPPORTED_FORMATS_FRONT.includes(format);
    }
}

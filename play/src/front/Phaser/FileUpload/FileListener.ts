import { FILE_UPLOAD_SUPPORTED_FORMATS_FRONT } from "@workadventure/map-editor";
import { get } from "svelte/store";
import { draggingFile } from "../../Stores/FileUploadStore";
import { popupStore } from "../../Stores/PopupStore";
import PopUpDropFileEntity from "../../Components/PopUp/PopUpDropFileEntity.svelte";
import { gameManager } from "../Game/GameManager";
import { warningMessageStore } from "../../Stores/ErrorStore";
import { userIsConnected } from "../../Stores/MenuStore";
import PopUpConnect from "../../Components/PopUp/PopUpConnect.svelte";
import LL from "../../../i18n/i18n-svelte";
import { GRPC_MAX_MESSAGE_SIZE } from "../../Enum/EnvironmentVariable";

export class FileListener {
    private canvas: HTMLCanvasElement;

    private boundDragOverHandler: (event: DragEvent) => void;
    private boundDragLeaveHandler: (event: DragEvent) => void;
    private boundDragEnterHandler: (event: DragEvent) => void;
    private boundDropHandler: (event: DragEvent) => void;
    private BYTES_TO_MB = 1024 * 1024;

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

        if (!get(draggingFile)) {
            return;
        }

        const gameScene = gameManager.getCurrentGameScene();

        const userIsAdmin = gameScene.connection?.isAdmin();
        const userIsEditor = gameScene.connection?.hasTag("editor");

        const gameMapAreas = gameScene.getGameMap().getGameMapAreas();
        const userId = gameScene.connection?.getUserId();
        const userTags = gameScene.connection?.getAllTags() ?? [];

        if (!get(userIsConnected)) {
            popupStore.addPopup(PopUpConnect, {}, "popupConnect");
            draggingFile.set(false);
            return;
        }

        if (
            !userIsAdmin &&
            !userIsEditor &&
            !gameMapAreas?.isGameMapContainsSpecificAreas(userId?.toString(), userTags)
        ) {
            warningMessageStore.addWarningMessage(get(LL).mapEditor.entityEditor.errors.dragNotAllowed(), {
                closable: true,
            });
            draggingFile.set(false);
            return;
        }

        const { files: filesFromDropEvent } = event.dataTransfer ?? {};
        if (filesFromDropEvent) {
            if (filesFromDropEvent.length > 1) {
                warningMessageStore.addWarningMessage(get(LL).mapEditor.entityEditor.uploadEntity.errorOnFileNumber(), {
                    closable: true,
                });
            } else {
                const file = filesFromDropEvent.item(0);

                if (file && file.size && file.size > GRPC_MAX_MESSAGE_SIZE) {
                    warningMessageStore.addWarningMessage(
                        get(LL).mapEditor.entityEditor.uploadEntity.errorOnFileSize({
                            size: GRPC_MAX_MESSAGE_SIZE / this.BYTES_TO_MB,
                        }),
                        {
                            closable: true,
                        }
                    );
                    draggingFile.set(false);
                    return;
                }

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
                    warningMessageStore.addWarningMessage(
                        get(LL).mapEditor.entityEditor.uploadEntity.errorOnFileFormat(),
                        { closable: true }
                    );
                }
            }
        }

        draggingFile.set(false);
    }

    private dragEnterHandler(event: DragEvent) {
        // If the drag event comes from an element inside the page, we ignore it
        // Note: relatedTarget is always null on WebKit because of a bug: https://bugs.webkit.org/show_bug.cgi?id=66547
        if (event.relatedTarget) {
            return;
        }
        event.preventDefault();

        draggingFile.set(true);
    }

    private dragOverHandler(event: DragEvent) {
        event.preventDefault();
    }

    private dragLeaveHandler(event: DragEvent) {
        event.preventDefault();

        draggingFile.set(false);
    }

    private isASupportedFormat(format: string): boolean {
        return format.trim().length > 0 && FILE_UPLOAD_SUPPORTED_FORMATS_FRONT.includes(format);
    }
}

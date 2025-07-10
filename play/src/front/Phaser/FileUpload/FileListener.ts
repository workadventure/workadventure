import { FILE_UPLOAD_SUPPORTED_FORMATS_FRONT, WAMEntityData } from "@workadventure/map-editor";
import { v4 as uuidv4 } from "uuid";
import { get } from "svelte/store";
import { draggingFile } from "../../Stores/FileUploadStore";
import { gameManager } from "../Game/GameManager";
import { UploadFileFrontCommand } from "../Game/MapEditor/Commands/File/UploadFileFrontCommand";
import { GameScene } from "../Game/GameScene";
import { CreateEntityFrontCommand } from "../Game/MapEditor/Commands/Entity/CreateEntityFrontCommand";
import { gameSceneStore } from "../../Stores/GameSceneStore";

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

        const rect = this.canvas.getBoundingClientRect();
        console.log("canvas rect", rect);
        ["mousedown", "mouseup", "click"].forEach((type) => {
            const mockPlayer = new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                clientX: event.x - rect.left,
                clientY: event.y - rect.top,
                view: window,
            });
            this.canvas.dispatchEvent(mockPlayer);
        });

        const scene = gameManager.getCurrentGameScene();

        console.log("event drop", event);

        const pointer = scene.input.mousePointer;

        const x = pointer.worldX;
        const y = pointer.worldY;

        console.log("x", x, "y", y, "dataTransfer", { ...event.dataTransfer });

        const { files: filesFromDropEvent } = event.dataTransfer ?? {};
        if (filesFromDropEvent) {
            if (filesFromDropEvent.length > 1) {
                console.error("Only one file is permitted");
            } else {
                const file = filesFromDropEvent.item(0);
                if (this.isASupportedFormat(file?.type ?? "")) {
                    if (file) {
                        const propertyId = this.createEntity(scene, event, file.name);
                        this.uploadFile(scene, file, propertyId)
                            .then(() => {
                                console.log("File uploaded successfully");
                            })
                            .catch((error) => {
                                console.error("Error uploading file:", error);
                            });
                    }
                } else {
                    console.error("File format not supported");
                }
            }
        }

        draggingFile.set(false);
    }

    private dragEnterHandler(event: DragEvent) {
        event.preventDefault();
        this.dragCounter++;

        const scene = gameManager.getCurrentGameScene();

        scene.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
            console.log("Pointer up detected", pointer.worldX, pointer.worldY);
        });

        console.log("event dragenter", event);

        draggingFile.set(true);
    }

    private dragOverHandler(event: DragEvent) {
        event.preventDefault();

        console.log("event dragover", event);

        draggingFile.set(true);
    }

    private dragLeaveHandler(event: DragEvent) {
        this.dragCounter--;
        if (this.dragCounter === 0) {
            console.log("dragging left");
            draggingFile.set(false);
        }

        const scene = gameManager.getCurrentGameScene();

        scene.input.off(Phaser.Input.Events.POINTER_UP);

        console.log("event dragleave", event);

        draggingFile.set(false);
    }

    private async uploadFile(scene: GameScene, file: File, propertyId: string) {
        const fileBuffer = await file.arrayBuffer();
        const fileAsUint8Array = new Uint8Array(fileBuffer);
        const generatedId = uuidv4();
        const fileToUpload = {
            id: generatedId,
            file: fileAsUint8Array,
            name: file.name,
            propertyId: propertyId,
        };

        const roomConnection = scene.connection;
        if (roomConnection === undefined) throw new Error("No connection");
        const uploadFileCommand = new UploadFileFrontCommand(fileToUpload);
        uploadFileCommand.emitEvent(roomConnection);
    }

    private createEntity(scene: GameScene, e: DragEvent, fileName: string): string {
        console.log("createEntity", e);

        const mapEditorModeManager = scene.getMapEditorModeManager();
        const entitiesManager = scene.getGameMapFrontWrapper().getEntitiesManager();

        const pointer = scene.input.mousePointer;
        const x = Math.floor(pointer.worldX);
        const y = Math.floor(pointer.worldY);

        console.log("dragDropEntity", pointer, x, y, fileName);

        const propertyId = uuidv4();

        const lastDot = fileName.lastIndexOf(".");
        const name = fileName.slice(0, lastDot);
        const fileExt = fileName.slice(lastDot + 1);

        const fileUrl = `${get(
            gameSceneStore
        )?.room.mapStorageUrl?.toString()}private/files/${name}-${propertyId}.${fileExt}`;

        const entityData: WAMEntityData = {
            x: x - 16,
            y: y - 16,
            prefabRef: {
                id: "basic office decoration:Books (Variant 5):black:Down",
                collectionName: "basic office decoration",
            },
            properties: [],
            name: name,
        };

        entityData.properties = [
            {
                type: "openFile",
                newTab: false,
                link: fileUrl,
                id: propertyId,
                name: fileName,
                buttonLabel: "Ouvrir",
                closable: true,
            },
        ];

        console.log("execute command");
        mapEditorModeManager
            .executeCommand(
                new CreateEntityFrontCommand(scene.getGameMap(), uuidv4(), entityData, undefined, entitiesManager, {
                    width: 32,
                    height: 32,
                })
            )
            .catch((e) => console.error(e));

        return propertyId;
    }

    private isASupportedFormat(format: string): boolean {
        return format.trim().length > 0 && FILE_UPLOAD_SUPPORTED_FORMATS_FRONT.includes(format);
    }
}

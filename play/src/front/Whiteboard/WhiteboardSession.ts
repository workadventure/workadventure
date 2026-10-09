import type { Subscription } from "rxjs";
import {
    CaptureUpdateAction,
    getVisibleSceneBounds,
    newElementWith,
    reconcileElements,
    restoreElements,
    zoomToFitBounds,
} from "@excalidraw/excalidraw";
import type {
    ExcalidrawElement,
    ExcalidrawImageElement,
    FileId,
    OrderedExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import type { RemoteExcalidrawElement } from "@excalidraw/excalidraw/data/reconcile";
import type {
    BinaryFileData,
    Collaborator,
    DataURL,
    ExcalidrawImperativeAPI,
    OnUserFollowedPayload,
    SocketId,
} from "@excalidraw/excalidraw/types";
import type { WhiteboardParticipant, WhiteboardPointerMessage, WhiteboardServerMessage } from "@workadventure/messages";
import type { RoomConnection } from "../Connection/RoomConnection";

const ELEMENTS_THROTTLE_MS = 50;
const POINTER_THROTTLE_MS = 50;

// The images the map-storage accepts (see WhiteboardStorageService), and the extension they are stored under.
const FILE_EXTENSIONS: Readonly<Record<string, string>> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
};

export interface WhiteboardSessionListener {
    onCanWriteChange(canWrite: boolean): void;
}

/**
 * Keeps one Excalidraw scene in sync with the board the back holds, the way excalidraw-app's collab does it:
 * only the elements whose version moved are sent, and what comes back is merged with reconcileElements.
 */
export class WhiteboardSession {
    private api: ExcalidrawImperativeAPI | undefined;
    private subscription: Subscription | undefined;
    // The version of each element as last sent or received, so that only real changes go out.
    private readonly knownVersions = new Map<string, number>();
    private readonly collaborators = new Map<SocketId, Collaborator>();
    private participants: WhiteboardParticipant[] = [];
    private followedUserId: number | undefined;
    private elementsTimer: ReturnType<typeof setTimeout> | undefined;
    private pointerTimer: ReturnType<typeof setTimeout> | undefined;
    private pendingPointer: WhiteboardPointerMessage | undefined;
    private lastPointer: Omit<WhiteboardPointerMessage, "visibleBounds"> | undefined;
    private boundsChanged = false;
    private joined = false;
    private canWrite = false;
    // Images being sent or fetched, by file id, so that each goes once.
    private readonly transfers = new Set<string>();
    private token: Promise<string> | undefined;

    /**
     * @param filesUrl Where the images of this board live in the map-storage (".../<propertyId>/"), or undefined
     *     when the map is not stored there, which leaves the image tool off.
     */
    constructor(
        private readonly connection: RoomConnection,
        private readonly areaId: string,
        private readonly propertyId: string,
        private readonly listener: WhiteboardSessionListener,
        private readonly filesUrl: URL | undefined,
    ) {}

    public attach(api: ExcalidrawImperativeAPI): void {
        if (this.api) {
            return;
        }
        this.api = api;
        this.subscription = this.connection.whiteboardMessageStream.subscribe((message) => {
            if (message.areaId === this.areaId && message.propertyId === this.propertyId) {
                this.handleServerMessage(message);
            }
        });
        this.connection.emitWhiteboardMessage({
            areaId: this.areaId,
            propertyId: this.propertyId,
            message: { $case: "join", join: {} },
        });
    }

    public destroy(): void {
        clearTimeout(this.elementsTimer);
        clearTimeout(this.pointerTimer);
        this.subscription?.unsubscribe();
        if (this.api) {
            this.connection.emitWhiteboardMessage({
                areaId: this.areaId,
                propertyId: this.propertyId,
                message: { $case: "leave", leave: {} },
            });
        }
        this.api = undefined;
    }

    /** Excalidraw's onChange: schedules the elements whose version moved. */
    public onLocalChange(): void {
        if (!this.joined) {
            return;
        }
        this.uploadPendingImages();
        if (this.elementsTimer !== undefined) {
            return;
        }
        this.elementsTimer = setTimeout(() => {
            this.elementsTimer = undefined;
            this.sendChangedElements();
        }, ELEMENTS_THROTTLE_MS);
    }

    public onPointerUpdate(payload: {
        pointer: { x: number; y: number; tool: "pointer" | "laser" };
        button: "down" | "up";
    }): void {
        this.lastPointer = {
            x: payload.pointer.x,
            y: payload.pointer.y,
            tool: payload.pointer.tool,
            button: payload.button,
        };
        this.schedulePointer();
    }

    public onScrollChange(): void {
        this.boundsChanged = true;
        if (this.lastPointer) {
            this.schedulePointer();
        }
    }

    public onUserFollow(payload: OnUserFollowedPayload): void {
        this.followedUserId = payload.action === "FOLLOW" ? Number(payload.userToFollow.socketId) : undefined;
    }

    private schedulePointer(): void {
        if (!this.joined || !this.api || !this.lastPointer) {
            return;
        }
        const pointer: WhiteboardPointerMessage = { ...this.lastPointer, visibleBounds: [] };
        if (this.boundsChanged) {
            pointer.visibleBounds = [...getVisibleSceneBounds(this.api.getAppState())];
            this.boundsChanged = false;
        }
        this.pendingPointer = pointer;
        if (this.pointerTimer !== undefined) {
            return;
        }
        this.pointerTimer = setTimeout(() => {
            this.pointerTimer = undefined;
            if (this.pendingPointer) {
                this.connection.emitWhiteboardMessage({
                    areaId: this.areaId,
                    propertyId: this.propertyId,
                    message: { $case: "pointer", pointer: this.pendingPointer },
                });
                this.pendingPointer = undefined;
            }
        }, POINTER_THROTTLE_MS);
    }

    private sendChangedElements(): void {
        if (!this.api) {
            return;
        }
        const changed = this.api
            .getSceneElementsIncludingDeleted()
            .filter((element) => (this.knownVersions.get(element.id) ?? -1) < element.version);
        if (changed.length === 0) {
            return;
        }
        for (const element of changed) {
            this.knownVersions.set(element.id, element.version);
        }
        this.connection.emitWhiteboardMessage({
            areaId: this.areaId,
            propertyId: this.propertyId,
            message: { $case: "elements", elements: { elementsJson: JSON.stringify(changed) } },
        });
    }

    private handleServerMessage(message: WhiteboardServerMessage): void {
        const payload = message.message;
        if (!payload || !this.api) {
            return;
        }
        switch (payload.$case) {
            case "scene": {
                this.canWrite = payload.scene.canWrite;
                this.listener.onCanWriteChange(payload.scene.canWrite);
                this.applyRemoteElements(payload.scene.elementsJson);
                this.joined = true;
                // Whatever was drawn here before the scene arrived (or while disconnected) goes up now.
                this.sendChangedElements();
                break;
            }
            case "elements": {
                this.applyRemoteElements(payload.elements.elementsJson);
                break;
            }
            case "pointer": {
                this.applyRemotePointer(payload.pointer.userId, payload.pointer.pointer);
                break;
            }
            case "participants": {
                this.participants = payload.participants.participants;
                this.refreshCollaborators();
                break;
            }
            default: {
                const _exhaustiveCheck: never = payload;
            }
        }
    }

    private applyRemoteElements(elementsJson: string): void {
        if (!this.api) {
            return;
        }
        const remote = restoreElements(JSON.parse(elementsJson) as OrderedExcalidrawElement[], null);
        const reconciled = reconcileElements(
            this.api.getSceneElementsIncludingDeleted(),
            remote as RemoteExcalidrawElement[],
            this.api.getAppState(),
        );
        for (const element of remote) {
            const known = this.knownVersions.get(element.id) ?? -1;
            if (element.version > known) {
                this.knownVersions.set(element.id, element.version);
            }
        }
        this.api.updateScene({ elements: reconciled, captureUpdate: CaptureUpdateAction.NEVER });
        this.fetchMissingImages(reconciled);
    }

    /**
     * Sends the images pasted here to the map-storage, then marks their elements "saved" (with their type, which
     * the others need to fetch them), so that the change carries the news to everybody.
     */
    private uploadPendingImages(): void {
        const api = this.api;
        if (!api || !this.filesUrl || !this.canWrite) {
            return;
        }
        const files = api.getFiles();
        for (const element of api.getSceneElements()) {
            if (element.type !== "image" || element.status !== "pending" || element.fileId === null) {
                continue;
            }
            const file = files[element.fileId];
            const extension = file ? FILE_EXTENSIONS[file.mimeType] : undefined;
            if (!file || !extension || this.transfers.has(file.id)) {
                continue;
            }
            this.transfers.add(file.id);
            (async () => {
                const body = await (await fetch(file.dataURL)).blob();
                const response = await this.fetchFile(`${file.id}.${extension}`, {
                    method: "PUT",
                    headers: { "Content-Type": file.mimeType },
                    body,
                });
                if (!response.ok) {
                    throw new Error(`The map-storage refused the image (${response.status})`);
                }
                this.markImageSaved(file.id, file.mimeType);
            })()
                .catch((error) => console.error("Could not send a whiteboard image", error))
                .finally(() => this.transfers.delete(file.id));
        }
    }

    private markImageSaved(fileId: FileId, mimeType: string): void {
        const api = this.api;
        if (!api) {
            return;
        }
        api.updateScene({
            elements: api
                .getSceneElementsIncludingDeleted()
                .map((element) =>
                    element.type === "image" && element.fileId === fileId && element.status === "pending"
                        ? newElementWith(element, { status: "saved", customData: { ...element.customData, mimeType } })
                        : element,
                ),
            captureUpdate: CaptureUpdateAction.NEVER,
        });
    }

    /** Fetches the images of the board this browser has not got yet. */
    private fetchMissingImages(elements: readonly ExcalidrawElement[]): void {
        const api = this.api;
        if (!api || !this.filesUrl) {
            return;
        }
        const files = api.getFiles();
        for (const element of elements) {
            if (!isSavedImage(element) || files[element.fileId] || this.transfers.has(element.fileId)) {
                continue;
            }
            const fileId = element.fileId;
            const mimeType = element.customData.mimeType;
            const extension = FILE_EXTENSIONS[mimeType];
            if (!extension) {
                continue;
            }
            this.transfers.add(fileId);
            (async () => {
                const response = await this.fetchFile(`${fileId}.${extension}`, { method: "GET" });
                if (!response.ok) {
                    throw new Error(`The map-storage did not send the image (${response.status})`);
                }
                const dataURL = await blobToDataURL(await response.blob());
                const file: BinaryFileData = {
                    id: fileId,
                    mimeType: mimeType as BinaryFileData["mimeType"],
                    dataURL,
                    created: Date.now(),
                };
                this.api?.addFiles([file]);
            })()
                .catch((error) => console.error("Could not fetch a whiteboard image", error))
                .finally(() => this.transfers.delete(fileId));
        }
    }

    /** A request to the map-storage with this user's token, asked again once if it expired. */
    private async fetchFile(fileName: string, init: RequestInit): Promise<Response> {
        const send = async () => {
            this.token ??= this.connection.queryMapStorageJwtToken().then((answer) => answer.jwt);
            const url = new URL(fileName, this.filesUrl);
            url.searchParams.set("token", await this.token);
            return fetch(url, init);
        };
        const response = await send();
        if (response.status !== 403) {
            return response;
        }
        this.token = undefined;
        return send();
    }

    private applyRemotePointer(userId: number, pointer: WhiteboardPointerMessage | undefined): void {
        if (!this.api || !pointer) {
            return;
        }
        const socketId = String(userId) as SocketId;
        const collaborator = this.collaborators.get(socketId);
        if (!collaborator) {
            return;
        }
        this.collaborators.set(socketId, {
            ...collaborator,
            pointer: { x: pointer.x, y: pointer.y, tool: pointer.tool === "laser" ? "laser" : "pointer" },
            button: pointer.button === "down" ? "down" : "up",
        });
        this.api.updateScene({ collaborators: new Map(this.collaborators) });

        if (userId === this.followedUserId && pointer.visibleBounds.length === 4) {
            const [minX, minY, maxX, maxY] = pointer.visibleBounds;
            const { appState } = zoomToFitBounds({
                bounds: [minX, minY, maxX, maxY],
                appState: this.api.getAppState(),
                fitToViewport: true,
                viewportZoomFactor: 1,
            });
            this.api.updateScene({
                appState: { scrollX: appState.scrollX, scrollY: appState.scrollY, zoom: appState.zoom },
                captureUpdate: CaptureUpdateAction.NEVER,
            });
        }
    }

    private refreshCollaborators(): void {
        if (!this.api) {
            return;
        }
        const myUserId = this.connection.getUserId();
        const previous = new Map(this.collaborators);
        this.collaborators.clear();
        for (const participant of this.participants) {
            if (participant.userId === myUserId) {
                continue;
            }
            const socketId = String(participant.userId) as SocketId;
            this.collaborators.set(socketId, {
                ...previous.get(socketId),
                id: participant.uuid,
                socketId,
                username: participant.name,
                color: colorFor(participant.uuid),
            });
        }
        this.api.updateScene({ collaborators: new Map(this.collaborators) });
    }
}

function isSavedImage(
    element: ExcalidrawElement,
): element is ExcalidrawImageElement & { fileId: FileId; customData: { mimeType: string } } {
    return (
        element.type === "image" &&
        !element.isDeleted &&
        element.status === "saved" &&
        element.fileId !== null &&
        typeof element.customData?.mimeType === "string"
    );
}

function blobToDataURL(blob: Blob): Promise<DataURL> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as DataURL);
        reader.onerror = () => reject(reader.error ?? new Error("Could not read the image"));
        reader.readAsDataURL(blob);
    });
}

/**
 * A stable color per person, so that a cursor keeps its color from one board (and one session) to the next.
 */
export function colorFor(uuid: string): { background: string; stroke: string } {
    let hash = 0;
    for (const char of uuid) {
        hash = (hash * 31 + char.charCodeAt(0)) | 0;
    }
    const hue = Math.abs(hash) % 360;
    return { background: `hsl(${hue}, 80%, 92%)`, stroke: `hsl(${hue}, 70%, 40%)` };
}

import { writable } from "svelte/store";
import { VideoBox } from "../Space/VideoBox";
import type { Streamable } from "../Space/Streamable";
import type { RoomConnection } from "../Connection/RoomConnection";
import type { MountedWhiteboard } from "../Whiteboard/WhiteboardApp";
import WhiteboardTile from "../Components/Whiteboard/WhiteboardTile.svelte";
import { inputFormFocusStore } from "./UserInputStore";

// Ahead of the cameras and of the screen shares, like the scripting videos (see VideoBoxPriorities).
const WHITEBOARD_PRIORITY = 500;

export interface WhiteboardOptions {
    areaId: string;
    propertyId: string;
    title: string;
    connection: RoomConnection;
    langCode: string;
    filesUrl: URL | undefined;
}

interface OpenWhiteboard {
    readonly videoBox: VideoBox;
    readonly host: HTMLDivElement;
    readonly releaseFocus: () => void;
    mounted?: MountedWhiteboard;
    closed: boolean;
}

/**
 * The whiteboards shown like a screen share: a tile among the cameras that the user highlights or puts fullscreen.
 *
 * The board lives here, not in the tile: the video layout destroys and recreates tiles all the time (when the
 * player moves, when the board goes from the row to the stage or to fullscreen). The tile only moves the
 * board's element (`host`) in and out of itself, so the Excalidraw scene and the session survive.
 */
function createWhiteboardStore() {
    const { subscribe, update } = writable<Map<string, VideoBox>>(new Map());
    const boards = new Map<string, OpenWhiteboard>();

    return {
        subscribe,

        open(options: WhiteboardOptions): VideoBox {
            const existing = boards.get(options.propertyId);
            if (existing) {
                return existing.videoBox;
            }

            const host = document.createElement("div");
            host.className = "absolute inset-0";
            const releaseFocus = trapKeyboard(host);
            const streamable: Streamable = {
                uniqueId: `whiteboard-${options.propertyId}`,
                media: {
                    type: "component",
                    component: WhiteboardTile,
                    props: { host, title: options.title },
                    isBlocked: writable(false),
                },
                volumeStore: undefined,
                spaceUserId: undefined,
                hasVideo: writable(true),
                hasAudio: writable(false),
                statusStore: writable("connected"),
                name: writable(options.title),
                showVoiceIndicator: writable(false),
                flipX: false,
                muteAudio: writable(true),
                displayMode: "fit",
                usePresentationMode: true,
                volume: writable(0),
                closeStreamable: () => {},
                canCloseStreamable: () => false,
                videoType: "component",
                webrtcStats: undefined,
            };
            const videoBox = VideoBox.fromLocalStreamable(streamable, WHITEBOARD_PRIORITY);
            const board: OpenWhiteboard = { videoBox, host, releaseFocus, closed: false };
            boards.set(options.propertyId, board);

            import("../Whiteboard/WhiteboardApp")
                .then(({ mountWhiteboard }) => {
                    if (!board.closed) {
                        board.mounted = mountWhiteboard(host, options);
                    }
                })
                .catch((error) => console.error("Could not load the whiteboard", error));

            update((videoBoxes) => {
                videoBoxes.set(videoBox.uniqueId, videoBox);
                return videoBoxes;
            });
            return videoBox;
        },

        close(propertyId: string): void {
            const board = boards.get(propertyId);
            if (!board) {
                return;
            }
            boards.delete(propertyId);
            board.closed = true;
            board.mounted?.destroy();
            board.releaseFocus();
            board.host.remove();
            update((videoBoxes) => {
                videoBoxes.delete(board.videoBox.uniqueId);
                board.videoBox.destroy();
                return videoBoxes;
            });
        },
    };
}

/**
 * Keys typed on the board must not walk the Woka, and clicking anywhere else gives the keyboard back to the game.
 */
function trapKeyboard(host: HTMLElement): () => void {
    const onFocusIn = () => inputFormFocusStore.set(true);
    const onFocusOut = (event: FocusEvent) => {
        if (!(event.relatedTarget instanceof Node && host.contains(event.relatedTarget))) {
            inputFormFocusStore.set(false);
        }
    };
    const onPointerDown = (event: PointerEvent) => {
        if (
            event.target instanceof Node &&
            !host.contains(event.target) &&
            document.activeElement instanceof HTMLElement &&
            host.contains(document.activeElement)
        ) {
            document.activeElement.blur();
        }
    };
    host.addEventListener("focusin", onFocusIn);
    host.addEventListener("focusout", onFocusOut);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
        host.removeEventListener("focusin", onFocusIn);
        host.removeEventListener("focusout", onFocusOut);
        document.removeEventListener("pointerdown", onPointerDown, true);
        if (host.contains(document.activeElement)) {
            inputFormFocusStore.set(false);
        }
    };
}

export const whiteboardStore = createWhiteboardStore();

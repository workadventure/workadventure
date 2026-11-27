import { get, writable } from "svelte/store";
import type { Readable, Writable } from "svelte/store";
import { VideoBox } from "../Space/VideoBox";
import type { Streamable } from "../Space/Streamable";
import type { RoomConnection } from "../Connection/RoomConnection";
import type { MountedWhiteboard, WhiteboardParticipantView } from "../Whiteboard/WhiteboardApp";
import WhiteboardTile from "../Components/Whiteboard/WhiteboardTile.svelte";
import { WhiteboardCoWebsite } from "../WebRtc/CoWebsite/WhiteboardCoWebsite";
import { inputFormFocusStore } from "./UserInputStore";
import { coWebsites } from "./CoWebsiteStore";
import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { highlightFullScreen } from "./ActionsCamStore";

// Ahead of the cameras and of the screen shares, like the scripting videos (see VideoBoxPriorities).
const WHITEBOARD_PRIORITY = 500;

/** A panel beside the map (to prepare the board alone), or the stage under the cameras (to draw in a meeting). */
export type WhiteboardMode = "panel" | "stage";

export interface WhiteboardOptions {
    areaId: string;
    areaName: string;
    propertyId: string;
    title: string;
    /** Only identifies the board (in analytics): there is nothing to load from it. */
    url: URL;
    connection: RoomConnection;
    langCode: string;
    filesUrl: URL | undefined;
    fullMessage: string;
}

/** What the board's header and its two homes (the co-website, the stage tile) show. */
export interface WhiteboardBoard {
    readonly propertyId: string;
    readonly title: string;
    /** The element Excalidraw draws in, moved from one home to the other. */
    readonly host: HTMLDivElement;
    readonly mode: Readable<WhiteboardMode>;
    /** The other people on the board. */
    readonly participants: Readable<WhiteboardParticipantView[]>;
    follow(participant: WhiteboardParticipantView): void;
    preview(): Promise<SVGSVGElement | undefined> | undefined;
}

interface OpenWhiteboard extends WhiteboardBoard {
    readonly options: WhiteboardOptions;
    readonly modeStore: Writable<WhiteboardMode>;
    readonly participantsStore: Writable<WhiteboardParticipantView[]>;
    readonly releaseFocus: () => void;
    videoBox?: VideoBox;
    coWebsite?: WhiteboardCoWebsite;
    mounted?: MountedWhiteboard;
    closed: boolean;
}

/**
 * The open whiteboards. A board lives here, not in what displays it: the video layout destroys and recreates its
 * tiles all the time, and the board moves between the co-website panel and the stage. Its homes only move its
 * element (`host`) in and out of themselves, so the Excalidraw scene and the session survive.
 */
function createWhiteboardStore() {
    // The stage tiles, merged into the streamables by StreamableCollectionStore.
    const { subscribe, update } = writable<Map<string, VideoBox>>(new Map());
    const boards = new Map<string, OpenWhiteboard>();
    // ponytail: kept for the browser tab only; store it in localUserStore if people want it across visits.
    const chosenModes = new Map<string, WhiteboardMode>();

    function leaveStage(board: OpenWhiteboard): void {
        const videoBox = board.videoBox;
        if (!videoBox) {
            return;
        }
        board.videoBox = undefined;
        if (get(highlightedEmbedScreen) === videoBox) {
            highlightFullScreen.set(false);
            highlightedEmbedScreen.removeHighlight();
        }
        update((videoBoxes) => {
            videoBoxes.delete(videoBox.uniqueId);
            videoBox.destroy();
            return videoBoxes;
        });
    }

    function leavePanel(board: OpenWhiteboard): void {
        if (board.coWebsite) {
            coWebsites.remove(board.coWebsite);
            board.coWebsite = undefined;
        }
    }

    function show(board: OpenWhiteboard, mode: WhiteboardMode): void {
        board.modeStore.set(mode);
        if (mode === "stage") {
            leavePanel(board);
            if (!board.videoBox) {
                const videoBox = VideoBox.fromLocalStreamable(stageStreamable(board), WHITEBOARD_PRIORITY);
                board.videoBox = videoBox;
                update((videoBoxes) => videoBoxes.set(videoBox.uniqueId, videoBox));
            }
            highlightedEmbedScreen.highlight(board.videoBox);
        } else {
            leaveStage(board);
            if (!board.coWebsite) {
                board.coWebsite = new WhiteboardCoWebsite(board.options.url, board);
                coWebsites.add(board.coWebsite, undefined, {
                    targetUrl: board.options.url.toString(),
                    triggerProperty: "other",
                    areaId: board.options.areaId,
                    areaName: board.options.areaName,
                });
            }
        }
    }

    return {
        subscribe,

        open(options: WhiteboardOptions): void {
            const existing = boards.get(options.propertyId);
            if (existing) {
                show(existing, get(existing.modeStore));
                return;
            }

            const host = document.createElement("div");
            host.className = "absolute inset-0";
            const participantsStore = writable<WhiteboardParticipantView[]>([]);
            const modeStore = writable<WhiteboardMode>(chosenModes.get(options.propertyId) ?? "panel");
            const board: OpenWhiteboard = {
                propertyId: options.propertyId,
                title: options.title,
                host,
                mode: modeStore,
                participants: participantsStore,
                follow: (participant) => board.mounted?.follow(participant),
                preview: () => board.mounted?.preview(),
                options,
                modeStore,
                participantsStore,
                releaseFocus: trapKeyboard(host),
                closed: false,
            };
            boards.set(options.propertyId, board);

            import("../Whiteboard/WhiteboardApp")
                .then(({ mountWhiteboard }) => {
                    if (!board.closed) {
                        board.mounted = mountWhiteboard(host, {
                            ...options,
                            onParticipantsChange: (participants) => participantsStore.set(participants),
                        });
                    }
                })
                .catch((error) => console.error("Could not load the whiteboard", error));

            show(board, get(modeStore));
        },

        /** The header's "put on stage" / "back to the panel"; remembered for the next time this board opens. */
        setMode(propertyId: string, mode: WhiteboardMode): void {
            const board = boards.get(propertyId);
            if (board) {
                chosenModes.set(propertyId, mode);
                show(board, mode);
            }
        },

        close(propertyId: string): void {
            const board = boards.get(propertyId);
            if (!board) {
                return;
            }
            boards.delete(propertyId);
            board.closed = true;
            leaveStage(board);
            leavePanel(board);
            board.mounted?.destroy();
            board.releaseFocus();
            board.host.remove();
        },

        /** When the game scene goes (map change, reconnection): a board is tied to the connection it opened with. */
        closeAll(): void {
            for (const propertyId of [...boards.keys()]) {
                this.close(propertyId);
            }
        },
    };
}

function stageStreamable(board: WhiteboardBoard): Streamable {
    return {
        uniqueId: `whiteboard-${board.propertyId}`,
        media: {
            type: "component",
            component: WhiteboardTile,
            props: { board },
            // The size of a screen share on the stage: the map stays visible around it.
            aspectRatio: 16 / 9,
            isBlocked: writable(false),
        },
        volumeStore: undefined,
        spaceUserId: undefined,
        hasVideo: writable(true),
        hasAudio: writable(false),
        statusStore: writable("connected"),
        name: writable(board.title),
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

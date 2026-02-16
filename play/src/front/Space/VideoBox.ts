import { type Writable, type Readable, writable, type Unsubscriber, get } from "svelte/store";
import { LAST_VIDEO_BOX_PRIORITY, type Streamable } from "../Stores/StreamableCollectionStore";
import type { PeerStatus } from "../WebRtc/RemotePeer";
import type { SpaceUserExtended } from "./SpaceInterface";
import { localSpaceUser } from "./localSpaceUser";

const CONNECTING_TIMEOUT_MS = 10000;

/**
 * A VideoBox represents a box displayed in the UI for a given user/screenshare.
 * It contains the streamable to display. The streamable can vary over time (for instance when switching from P2P to Livekit,
 * or when a reconnection happens and a new streamable is created).
 * The VideoBox keeps track of the streamable's status and exposes its own status derived from the status of
 * the streamables that it contained.
 * If streamables are stuck for more than 10 seconds in "connecting" status, the VideoBox switches to "error" status.
 */
export class VideoBox {
    private readonly _streamable: Writable<Streamable | undefined>;
    // The order in which the video boxes are displayed. Lower means more to the left/top.
    // The displayOrder is derived from the priority using the StableNSorter.
    public readonly displayOrder: Writable<number> = writable(0);
    // Timestamp of the last time the streamable was speaking
    public lastSpeakTimestamp?: number;
    public boxStyle?: { [key: string]: unknown };
    public readonly statusStore: Writable<PeerStatus> = writable("connecting");
    private connectingTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private streamableStatusUnsubscriber: Unsubscriber | null = null;

    public constructor(
        public readonly uniqueId: string,
        public readonly spaceUser: SpaceUserExtended,
        streamable: Streamable | undefined,
        // The lower the priority, the more important the streamable is.
        // -2: reserved for the local camera
        // -1: reserved for the local screen sharing
        // 0 - 1000: Videos started with scripting API
        // From 1000 - 2000: other screen sharing streams
        // 2000+: other streams
        public priority: number,
        displayOrder: number,
        // If true, the video box is a megaphone space
        public readonly isMegaphoneSpace = false
    ) {
        this._streamable = writable(undefined);
        this.displayOrder = writable(displayOrder);
        this.setNewStreamable(streamable);
    }

    public static fromLocalStreamable(streamable: Streamable, priority: number): VideoBox {
        return new VideoBox(streamable.uniqueId, localSpaceUser(get(streamable.name)), streamable, priority, 9999);
    }

    public static fromRemoteSpaceUser(
        spaceUser: SpaceUserExtended,
        isScreenSharing: boolean,
        isMegaphoneSpace: boolean
    ): VideoBox {
        return new VideoBox(
            isScreenSharing ? "screensharing_" + spaceUser.spaceUserId : spaceUser.spaceUserId,
            spaceUser,
            undefined,
            LAST_VIDEO_BOX_PRIORITY,
            9999,
            isMegaphoneSpace
        );
    }

    public setNewStreamable(streamable: Streamable | undefined): void {
        this._streamable.set(streamable);

        // Clean up previous subscription
        if (this.streamableStatusUnsubscriber) {
            this.streamableStatusUnsubscriber();
            this.streamableStatusUnsubscriber = null;
        }

        if (streamable) {
            // Subscribe to the streamable's statusStore
            this.streamableStatusUnsubscriber = streamable.statusStore.subscribe((status: PeerStatus) => {
                this.handleStatusChange(status);
            });
        }
    }

    private handleStatusChange(status: PeerStatus): void {
        if (status === "connecting") {
            // Set the status to connecting
            this.statusStore.set(status);
            // Start a timeout to switch to error after 10 seconds (only if not already running)
            if (this.connectingTimeoutId === null) {
                this.connectingTimeoutId = setTimeout(() => {
                    this.statusStore.set("error");
                    this.connectingTimeoutId = null;
                }, CONNECTING_TIMEOUT_MS);
            }
        } else {
            // Clear the timeout only when receiving a status different from "connecting"
            this.clearConnectingTimeout();
            // For any other status, set it directly
            this.statusStore.set(status);
        }
    }

    private clearConnectingTimeout(): void {
        if (this.connectingTimeoutId !== null) {
            clearTimeout(this.connectingTimeoutId);
            this.connectingTimeoutId = null;
        }
    }

    public destroy(): void {
        this.clearConnectingTimeout();
        if (this.streamableStatusUnsubscriber) {
            this.streamableStatusUnsubscriber();
            this.streamableStatusUnsubscriber = null;
        }
    }

    public get streamable(): Readable<Streamable | undefined> {
        return this._streamable;
    }
}

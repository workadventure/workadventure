import { type Writable, type Readable, writable, type Unsubscriber, get } from "svelte/store";
import type { PeerStatus } from "../WebRtc/RemotePeer";
import type { SpaceUserExtended } from "./SpaceInterface";
import { localSpaceUser } from "./localSpaceUser";
import { LAST_VIDEO_BOX_PRIORITY } from "./VideoBoxPriorities";
import type { Streamable } from "./Streamable";

const CONNECTING_TIMEOUT_MS = 10000;
const PENDING_STREAMABLE_FIRST_FRAME_TIMEOUT_MS = 5000;

export type VideoBoxStatus = PeerStatus | "reconnecting";

export interface VideoBoxStreamable {
    readonly streamable: Streamable;
    readonly isActive: boolean;
    readonly waitsForFirstFrame: boolean;
}

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
    private readonly _pendingStreamable: Writable<Streamable | undefined> = writable(undefined);
    private readonly _waitsForPendingFirstFrame: Writable<boolean> = writable(false);
    private readonly _streamables: Writable<VideoBoxStreamable[]> = writable([]);
    // The order in which the video boxes are displayed. Lower means more to the left/top.
    // The displayOrder is derived from the priority using the StableNSorter.
    public readonly displayOrder: Writable<number> = writable(0);
    // Timestamp of the last time the streamable was speaking
    public lastSpeakTimestamp?: number;
    public boxStyle?: { [key: string]: unknown };
    public readonly statusStore: Writable<VideoBoxStatus> = writable("connecting");
    private connectingTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private pendingStreamableFirstFrameTimeoutId: ReturnType<typeof setTimeout> | null = null;
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
        console.log(
            "AAAAAAAAAAAAAAAAAAA CONSTRUCTOR CALLED",
            uniqueId,
            spaceUser.spaceUserId,
            streamable?.uniqueId,
            priority,
            displayOrder
        );
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
        const currentStreamable = get(this._streamable);

        if (streamable === currentStreamable) {
            this.clearPendingStreamable(true);
            return;
        }

        if (streamable === get(this._pendingStreamable)) {
            return;
        }

        if (!streamable || !currentStreamable || !this.shouldWaitForFirstFrame(streamable)) {
            console.log("TRIGGERING NOW BECAUSE streamable", streamable, "CURRENT STREAMABLE", currentStreamable);
            this.promoteStreamable(streamable, true);
            return;
        }

        this.setPendingStreamable(streamable);
    }

    public markStreamableRendered(streamable: Streamable): void {
        if (get(this._pendingStreamable) !== streamable) {
            return;
        }
        //this.promotePendingStreamable();
    }

    public removeStreamable(streamable: Streamable): void {
        if (get(this._pendingStreamable) === streamable) {
            this.clearPendingStreamable();
            return;
        }

        if (get(this._streamable) !== streamable) {
            return;
        }

        const pendingStreamable = get(this._pendingStreamable);
        if (pendingStreamable) {
            this.promoteStreamable(pendingStreamable, false);
            return;
        }

        this.promoteStreamable(undefined, false);
    }

    private setPendingStreamable(streamable: Streamable): void {
        const previousPendingStreamable = get(this._pendingStreamable);
        if (previousPendingStreamable === streamable) {
            return;
        }

        this.clearPendingStreamable(true, false);
        this._pendingStreamable.set(streamable);
        this._waitsForPendingFirstFrame.set(true);
        this.refreshStreamables();
        this.pendingStreamableFirstFrameTimeoutId = setTimeout(() => {
            if (get(this._pendingStreamable) !== streamable) {
                return;
            }

            console.warn("Promoting pending streamable before first video frame after timeout", {
                videoBoxId: this.uniqueId,
                streamableId: streamable.uniqueId,
                mediaType: streamable.media.type,
            });
            this.promotePendingStreamable();
        }, PENDING_STREAMABLE_FIRST_FRAME_TIMEOUT_MS);
    }

    private promotePendingStreamable(): void {
        this.promoteStreamable(get(this._pendingStreamable), true);
    }

    private promoteStreamable(streamable: Streamable | undefined, closePreviousStreamable: boolean): void {
        console.trace("AAAAAAA promoteStreamable", this.spaceUser.spaceUserId);
        const previousStreamable = get(this._streamable);
        const pendingStreamable = get(this._pendingStreamable);
        this.clearPendingStreamable(false, false);
        this.setActiveStreamable(streamable, false);
        this.refreshStreamables();

        if (pendingStreamable && pendingStreamable !== streamable) {
            try {
                pendingStreamable.closeStreamable();
            } catch (e) {
                console.error("Error while closing pending streamable", e);
            }
        }

        if (closePreviousStreamable && previousStreamable && previousStreamable !== streamable) {
            this.closeStreamableAfterPromotion(previousStreamable);
        }
    }

    private closeStreamableAfterPromotion(streamable: Streamable): void {
        setTimeout(() => {
            try {
                streamable.closeStreamable();
            } catch (e) {
                console.error("Error while closing previous streamable", e);
            }
        }, 0);
    }

    private setActiveStreamable(streamable: Streamable | undefined, shouldRefreshStreamables = true): void {
        console.trace("AAAAAAA setActiveStreamable", this.spaceUser.spaceUserId, streamable?.uniqueId);
        this._streamable.set(streamable);

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

        if (shouldRefreshStreamables) {
            this.refreshStreamables();
        }
    }

    private clearPendingStreamable(closePendingStreamable = false, shouldRefreshStreamables = true): void {
        const pendingStreamable = get(this._pendingStreamable);
        if (closePendingStreamable && pendingStreamable) {
            try {
                pendingStreamable.closeStreamable();
            } catch (e) {
                console.error("Error while closing pending streamable", e);
            }
        }

        if (this.pendingStreamableFirstFrameTimeoutId !== null) {
            clearTimeout(this.pendingStreamableFirstFrameTimeoutId);
            this.pendingStreamableFirstFrameTimeoutId = null;
        }

        this._pendingStreamable.set(undefined);
        this._waitsForPendingFirstFrame.set(false);

        if (shouldRefreshStreamables) {
            this.refreshStreamables();
        }
    }

    private refreshStreamables(): void {
        const streamables: VideoBoxStreamable[] = [];
        const activeStreamable = get(this._streamable);
        const pendingStreamable = get(this._pendingStreamable);

        if (activeStreamable) {
            streamables.push({
                streamable: activeStreamable,
                isActive: true,
                waitsForFirstFrame: false,
            });
        }

        if (pendingStreamable) {
            streamables.push({
                streamable: pendingStreamable,
                isActive: false,
                waitsForFirstFrame: get(this._waitsForPendingFirstFrame),
            });
        }

        this._streamables.set(streamables);
    }

    private shouldWaitForFirstFrame(streamable: Streamable): boolean {
        console.log(
            "shouldWaitForFirstFrame",
            streamable.uniqueId,
            streamable.media.type,
            this.spaceUser.spaceUserId,
            this.spaceUser.cameraState,
            this.spaceUser.screenSharingState,
            get(streamable.hasVideo),
            streamable.videoType
        );
        if (streamable.media.type === "component" || streamable.media.type === "scripting") {
            return false;
        }

        if (streamable.videoType === "video") {
            console.log("RETURNING ", this.spaceUser.cameraState);
            return this.spaceUser.cameraState;
        }

        if (streamable.videoType === "screenSharing") {
            return this.spaceUser.screenSharingState;
        }

        return get(streamable.hasVideo);
    }

    private handleStatusChange(status: PeerStatus): void {
        if (status === "closed" && get(this._pendingStreamable)) {
            this.promoteStreamable(get(this._pendingStreamable), false);
            return;
        }

        if (status === get(this.statusStore)) {
            // If we receive the same status as the one we already have, do nothing (this can happen for instance when we set a new streamable that has the same status as the previous one).
            return;
        }

        if (status === "connecting") {
            // Start a timeout to switch to error after 10 seconds (only if not already running)
            if (this.connectingTimeoutId === null) {
                this.connectingTimeoutId = setTimeout(() => {
                    this.statusStore.set("error");
                    this.connectingTimeoutId = null;
                }, CONNECTING_TIMEOUT_MS);
            }
            // If the streamable is "connecting" and the previous status is not "connecting", we consider that we are in a reconnection phase and we set the status to "reconnecting" to display a specific UI in this case.
            this.statusStore.set("reconnecting");
        } else {
            // Clear the timeout only when receiving a status different from "connecting"
            this.clearConnectingTimeout();
            this.statusStore.set(status);
        }
    }

    private clearConnectingTimeout(): void {
        if (this.connectingTimeoutId !== null) {
            clearTimeout(this.connectingTimeoutId);
            this.connectingTimeoutId = null;
        }
    }

    public destroy(shouldForceClose: boolean = false): void {
        this.clearConnectingTimeout();
        const pendingStreamable = get(this.pendingStreamable);
        this.clearPendingStreamable();
        if (this.streamableStatusUnsubscriber) {
            this.streamableStatusUnsubscriber();
            this.streamableStatusUnsubscriber = null;
        }
        const streamable = get(this.streamable);
        if (streamable && (streamable.canCloseStreamable() || shouldForceClose)) {
            streamable.closeStreamable();
        }
        if (pendingStreamable && (pendingStreamable.canCloseStreamable() || shouldForceClose)) {
            pendingStreamable.closeStreamable();
        }
    }

    public get streamable(): Readable<Streamable | undefined> {
        return this._streamable;
    }

    public get pendingStreamable(): Readable<Streamable | undefined> {
        return this._pendingStreamable;
    }

    public get waitsForPendingFirstFrame(): Readable<boolean> {
        return this._waitsForPendingFirstFrame;
    }

    public get streamables(): Readable<VideoBoxStreamable[]> {
        return this._streamables;
    }
}

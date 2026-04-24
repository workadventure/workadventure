import * as Sentry from "@sentry/svelte";
import { type Writable, type Readable, writable, type Unsubscriber, get } from "svelte/store";
import type { PeerStatus } from "../WebRtc/RemotePeer";
import type { SpaceUserExtended } from "./SpaceInterface";
import { localSpaceUser } from "./localSpaceUser";
import { LAST_VIDEO_BOX_PRIORITY } from "./VideoBoxPriorities";
import type { Streamable } from "./Streamable";

const CONNECTING_TIMEOUT_MS = 10000;

export type VideoBoxStatus = PeerStatus | "reconnecting";

export interface VideoBoxStreamableEntry {
    id: number;
    streamable: Streamable;
    isPending: boolean;
}

interface InternalVideoBoxStreamableEntry {
    id: number;
    streamable: Streamable;
    waitForFirstFrame: boolean;
}

interface SetNewStreamableOptions {
    waitForFirstFrame?: boolean;
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
    private readonly _streamables: Writable<VideoBoxStreamableEntry[]>;
    // The order in which the video boxes are displayed. Lower means more to the left/top.
    // The displayOrder is derived from the priority using the StableNSorter.
    public readonly displayOrder: Writable<number> = writable(0);
    // Timestamp of the last time the streamable was speaking
    public lastSpeakTimestamp?: number;
    public boxStyle?: { [key: string]: unknown };
    public readonly statusStore: Writable<VideoBoxStatus> = writable("connecting");
    private connectingTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private activeStreamableStatusUnsubscriber: Unsubscriber | null = null;
    private pendingStreamableStatusUnsubscriber: Unsubscriber | null = null;
    private activeStreamableEntry: InternalVideoBoxStreamableEntry | undefined;
    private pendingStreamableEntry: InternalVideoBoxStreamableEntry | undefined;
    private nextStreamableId = 0;

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
        this._streamables = writable([]);
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

    public setNewStreamable(streamable: Streamable | undefined, options: SetNewStreamableOptions = {}): void {
        if (!streamable) {
            const previousActiveStreamableEntry = this.activeStreamableEntry;
            const previousPendingStreamableEntry = this.pendingStreamableEntry;
            this.setPendingStreamableEntry(undefined);
            this.setActiveStreamableEntry(undefined);
            if (previousActiveStreamableEntry) {
                this.closeStreamableEntry(previousActiveStreamableEntry);
            }
            if (previousPendingStreamableEntry) {
                this.closeStreamableEntry(previousPendingStreamableEntry);
            }
            this.refreshStreamables();
            return;
        }

        const streamableEntry = this.createStreamableEntry(streamable, options.waitForFirstFrame ?? false);

        if (!this.activeStreamableEntry) {
            this.setPendingStreamableEntry(undefined);
            this.setActiveStreamableEntry(streamableEntry);
            this.refreshStreamables();
            return;
        }

        if (!streamableEntry.waitForFirstFrame) {
            this.promoteNewStreamable(streamableEntry);
            return;
        }

        this.setPendingStreamableEntry(streamableEntry);
        this.refreshStreamables();
    }

    public markPendingStreamableReady(streamableId: number): void {
        if (this.pendingStreamableEntry?.id !== streamableId) {
            return;
        }

        this.promotePendingStreamable();
    }

    private handleStatusChange(status: PeerStatus): void {
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

    private handleActiveStreamableStatusChange(
        streamableEntry: InternalVideoBoxStreamableEntry,
        status: PeerStatus
    ): void {
        if (this.activeStreamableEntry?.id !== streamableEntry.id) {
            return;
        }

        if (this.pendingStreamableEntry && (status === "closed" || status === "error")) {
            console.warn(
                `Active streamable ${streamableEntry.streamable.uniqueId} ended before pending streamable became ready`
            );
            Sentry.captureMessage(
                `Active streamable ${streamableEntry.streamable.uniqueId} ended before pending streamable became ready`
            );
            this.promotePendingStreamable();
            return;
        }

        this.handleStatusChange(status);
    }

    private handlePendingStreamableStatusChange(
        streamableEntry: InternalVideoBoxStreamableEntry,
        status: PeerStatus
    ): void {
        if (this.pendingStreamableEntry?.id !== streamableEntry.id) {
            return;
        }

        // In case an error happens with the new stream, let's display the error immediately
        // It doesn't make sense to keep the old stream running if the new stream is in error, as the old streamable
        // will be garbage collected anyway.
        if (status === "closed" || status === "error") {
            this.promotePendingStreamable();
        }
    }

    private createStreamableEntry(streamable: Streamable, waitForFirstFrame: boolean): InternalVideoBoxStreamableEntry {
        return {
            id: this.nextStreamableId++,
            streamable,
            waitForFirstFrame,
        };
    }

    private setActiveStreamableEntry(streamableEntry: InternalVideoBoxStreamableEntry | undefined): void {
        this.activeStreamableStatusUnsubscriber?.();
        this.activeStreamableStatusUnsubscriber = null;
        this.activeStreamableEntry = streamableEntry;
        this._streamable.set(streamableEntry?.streamable);

        if (!streamableEntry) {
            return;
        }

        this.activeStreamableStatusUnsubscriber = streamableEntry.streamable.statusStore.subscribe((status) => {
            this.handleActiveStreamableStatusChange(streamableEntry, status);
        });
    }

    private setPendingStreamableEntry(
        streamableEntry: InternalVideoBoxStreamableEntry | undefined,
        closePreviousStreamable = true
    ): void {
        const previousPendingStreamableEntry = this.pendingStreamableEntry;

        this.pendingStreamableStatusUnsubscriber?.();
        this.pendingStreamableStatusUnsubscriber = null;
        this.pendingStreamableEntry = streamableEntry;

        if (
            closePreviousStreamable &&
            previousPendingStreamableEntry &&
            previousPendingStreamableEntry.id !== streamableEntry?.id
        ) {
            this.closeStreamableEntry(previousPendingStreamableEntry);
        }

        if (!streamableEntry) {
            return;
        }

        this.pendingStreamableStatusUnsubscriber = streamableEntry.streamable.statusStore.subscribe((status) => {
            this.handlePendingStreamableStatusChange(streamableEntry, status);
        });
    }

    private promoteNewStreamable(streamableEntry: InternalVideoBoxStreamableEntry): void {
        const previousActiveStreamableEntry = this.activeStreamableEntry;
        this.setPendingStreamableEntry(undefined, false);
        this.setActiveStreamableEntry(streamableEntry);
        if (previousActiveStreamableEntry) {
            this.closeStreamableEntry(previousActiveStreamableEntry);
        }
        this.refreshStreamables();
    }

    public promotePendingStreamable(): void {
        if (!this.pendingStreamableEntry) {
            return;
        }

        this.promoteNewStreamable(this.pendingStreamableEntry);
    }

    private refreshStreamables(): void {
        const streamables: VideoBoxStreamableEntry[] = [];

        if (this.activeStreamableEntry) {
            streamables.push({
                id: this.activeStreamableEntry.id,
                streamable: this.activeStreamableEntry.streamable,
                isPending: false,
            });
        }

        if (this.pendingStreamableEntry) {
            streamables.push({
                id: this.pendingStreamableEntry.id,
                streamable: this.pendingStreamableEntry.streamable,
                isPending: true,
            });
        }

        this._streamables.set(streamables);
    }

    private clearConnectingTimeout(): void {
        if (this.connectingTimeoutId !== null) {
            clearTimeout(this.connectingTimeoutId);
            this.connectingTimeoutId = null;
        }
    }

    private closeStreamableEntry(streamableEntry: InternalVideoBoxStreamableEntry): void {
        //if (streamableEntry.streamable.canCloseStreamable()) {
        streamableEntry.streamable.closeStreamable();
        //}
    }

    public destroy(shouldForceClose: boolean = false): void {
        this.clearConnectingTimeout();
        this.activeStreamableStatusUnsubscriber?.();
        this.pendingStreamableStatusUnsubscriber?.();
        this.activeStreamableStatusUnsubscriber = null;
        this.pendingStreamableStatusUnsubscriber = null;

        const streamables = [this.activeStreamableEntry?.streamable, this.pendingStreamableEntry?.streamable].filter(
            (streamable): streamable is Streamable => streamable !== undefined
        );

        for (const streamable of streamables) {
            // TODO: this might be wrong. Destroying the video box does not mean we can destroy the RemotePeer.
            // The lifecycle of the RemotePeer should be decided by the server, no?
            if (streamable.canCloseStreamable() || shouldForceClose) {
                streamable.closeStreamable();
            }
        }
    }

    public applyToAllStreamables(callback: (streamable: Streamable) => void): void {
        if (this.activeStreamableEntry) {
            callback(this.activeStreamableEntry.streamable);
        }

        if (this.pendingStreamableEntry) {
            callback(this.pendingStreamableEntry.streamable);
        }
    }

    // TODO: check in details where this is used and if we should not apply this to both streamables.
    public get streamable(): Readable<Streamable | undefined> {
        return this._streamable;
    }

    public get streamables(): Readable<VideoBoxStreamableEntry[]> {
        return this._streamables;
    }
}

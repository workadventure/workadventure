import Debug from "debug";
import { ConnectionError, ConnectionErrorReason } from "livekit-client";
import type { Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import type { Readable } from "svelte/store";
import type { SpaceInterface } from "../Space/SpaceInterface";
import type { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { CommunicationMessageType } from "../Space/SpacePeerManager/CommunicationMessageType";
import { streamingMegaphoneStore, type LocalStreamStoreValue } from "../Stores/MediaStore";
import type { LiveKitProximityFileTransferRoom } from "../Chat/Connection/Proximity/LiveKitFileTransferTransport";
import type { LiveKitRoomInterface } from "./LiveKitRoomInterface";
import { LiveKitRoom } from "./LiveKitRoom";

const debug = Debug("LivekitConnection");

export enum CommunicationType {
    NONE = "NONE",
    WEBRTC = "WEBRTC",
    LIVEKIT = "LIVEKIT",
}

export class LivekitConnection {
    private readonly unsubscribers: Subscription[] = [];
    private livekitRoom: LiveKitRoom | undefined;
    private shutdownAbortController: AbortController | undefined;
    // Last scripting stream dispatched to this space. Every room (the first one and every replacement after a
    // terminal disconnection) publishes it right after joining.
    private lastDispatchedStream: MediaStream | undefined;
    constructor(
        private space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        private _blockedUsersStore: Readable<Set<string>>,
        private _screenSharingLocalStreamStore: Readable<LocalStreamStoreValue | undefined>,
        private _streamingMegaphoneStore = streamingMegaphoneStore,
    ) {
        this.initialize();
    }

    private createLivekitRoom(
        serverUrl: string,
        token: string,
        shutdownAbortSignal: AbortSignal,
    ): LiveKitRoomInterface {
        this.livekitRoom = new LiveKitRoom(
            serverUrl,
            token,
            this.space,
            this._streamableSubjects,
            this._blockedUsersStore,
            shutdownAbortSignal,
            this._screenSharingLocalStreamStore,
        );
        this._streamingMegaphoneStore.set(true);
        return this.livekitRoom;
    }

    private initialize() {
        this.unsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.LIVEKIT_INVITATION_MESSAGE).subscribe((message) => {
                if (this.livekitRoom) {
                    // The back re-invites us after the previous room died (see LiveKitRoom.handleDisconnected).
                    // Tear the old room down first so two rooms never share the same identity.
                    debug("Replacing the existing Livekit room with a new invitation");
                    this.shutdownAbortController?.abort();
                    this.livekitRoom.destroy();
                    this.livekitRoom = undefined;
                }
                this.shutdownAbortController = new AbortController();
                const serverUrl = message.livekitInvitationMessage.serverUrl;
                const token = message.livekitInvitationMessage.token;

                const room = this.createLivekitRoom(serverUrl, token, this.shutdownAbortController.signal);

                (async () => {
                    await room.prepareConnection();
                    await room.joinRoom();
                    if (this.lastDispatchedStream) {
                        await this.dispatchStream(this.lastDispatchedStream);
                    }
                })().catch((err) => {
                    if (err instanceof ConnectionError && err.message === "Client initiated disconnect") {
                        // This error is triggered when the "destroy" method is called before Livekit connection completes.
                        // It can happen when the user leaves the space just after joining it.
                        // In this case, we don't want to log an error.
                        debug("Livekit connection aborted because the user left the space");
                        return;
                    }
                    if (
                        err instanceof ConnectionError &&
                        (err.reason === ConnectionErrorReason.ServerUnreachable ||
                            err.reason === ConnectionErrorReason.Timeout)
                    ) {
                        // The LiveKit server cannot be reached (network outage on the user's side, typically).
                        // LiveKitRoom.handleDisconnected already asked the back for a new invitation: not a bug.
                        console.warn("Could not reach the Livekit server, a new connection will be requested", err);
                        return;
                    }
                    console.error("An error occurred in LivekitConnection initialize", err);
                    Sentry.captureException(err);
                });
            }),
        );
        this.unsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.LIVEKIT_DISCONNECT_MESSAGE).subscribe((message) => {
                if (!this.livekitRoom) {
                    console.error("LivekitRoom not found");
                    // Sentry.captureException(new Error("LivekitRoom not found"));
                    return;
                }
                this.shutdownAbortController?.abort();
                this.shutdownAbortController = undefined;
                this.livekitRoom?.destroy();
                this.livekitRoom = undefined;
            }),
        );
    }

    async dispatchStream(mediaStream: MediaStream): Promise<void> {
        this.lastDispatchedStream = mediaStream;
        if (!this.livekitRoom) {
            return;
        }

        try {
            await this.livekitRoom.dispatchStream(mediaStream);
        } catch (err) {
            console.error("Error dispatching stream to Livekit room:", err);
            Sentry.captureException(err);
            throw err;
        }
    }

    getProximityFileTransferRoom(): LiveKitProximityFileTransferRoom | undefined {
        return this.livekitRoom;
    }

    destroy() {
        if (!this.livekitRoom) {
            return;
        }

        try {
            this.shutdownAbortController?.abort();
            this.shutdownAbortController = undefined;
            this.livekitRoom?.destroy();
        } catch (err) {
            console.error("Error destroying Livekit room:", err);
            Sentry.captureException(err);
        }
        this._streamingMegaphoneStore.set(false);
        for (const subscription of this.unsubscribers) {
            subscription.unsubscribe();
        }
    }

    /**
     * Starts the shutdown process of the communication state. It does not remove all video peers immediately,
     * but any asynchronous operation receiving a new stream should be ignored after this call.
     */
    shutdown() {
        this.shutdownAbortController?.abort();
        this.shutdownAbortController = undefined;
    }

    /**
     * [DEBUG] Forces the WebSocket connection to close to test reconnection mechanism.
     * This method is for development/testing purposes only.
     * @returns true if the WebSocket was closed, false if no connection exists
     */
    forceWebSocketClose(): boolean {
        if (!this.livekitRoom) {
            console.warn("[DEBUG] No LiveKit room found to force WebSocket close");
            return false;
        }
        return this.livekitRoom.forceWebSocketClose();
    }
}

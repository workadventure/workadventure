import { Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import { Readable } from "svelte/store";
import { SpaceInterface } from "../Space/SpaceInterface";
import { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { Streamable } from "../Stores/StreamableCollectionStore";
import { CommunicationMessageType } from "../Space/SpacePeerManager/CommunicationMessageType";
import { streamingMegaphoneStore } from "../Stores/MediaStore";
import { LiveKitRoomInterface } from "./LiveKitRoomInterface";
import { LiveKitRoom } from "./LiveKitRoom";

export enum CommunicationType {
    NONE = "NONE",
    WEBRTC = "WEBRTC",
    LIVEKIT = "LIVEKIT",
}

export class LivekitConnection {
    private readonly unsubscribers: Subscription[] = [];
    private livekitRoom: LiveKitRoom | undefined;
    constructor(
        private space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        private _blockedUsersStore: Readable<Set<string>>,
        private _streamingMegaphoneStore = streamingMegaphoneStore
    ) {
        this.initialize();
    }

    private createLivekitRoom(serverUrl: string, token: string): LiveKitRoomInterface {
        this.livekitRoom = new LiveKitRoom(
            serverUrl,
            token,
            this.space,
            this._streamableSubjects,
            this._blockedUsersStore
        );
        this._streamingMegaphoneStore.set(true);
        return this.livekitRoom;
    }

    private initialize() {
        this.unsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.LIVEKIT_INVITATION_MESSAGE).subscribe((message) => {
                const serverUrl = message.livekitInvitationMessage.serverUrl;
                const token = message.livekitInvitationMessage.token;

                const room = this.createLivekitRoom(serverUrl, token);

                room.prepareConnection()
                    .then(() => {
                        room.joinRoom().catch((err) => {
                            console.error("An error occurred in executeSwitchMessage", err);
                            Sentry.captureException(err);
                        });
                    })
                    .catch((err) => {
                        console.error("An error occurred in LivekitConnection initialize", err);
                        Sentry.captureException(err);
                    });
            })
        );
        this.unsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.LIVEKIT_DISCONNECT_MESSAGE).subscribe((message) => {
                if (!this.livekitRoom) {
                    console.error("LivekitRoom not found");
                    Sentry.captureException(new Error("LivekitRoom not found"));
                    return;
                }
                this.livekitRoom?.leaveRoom();
                this.livekitRoom?.destroy();
                this.livekitRoom = undefined;
            })
        );
    }

    async dispatchStream(mediaStream: MediaStream): Promise<void> {
        if (!this.livekitRoom) {
            console.error("LivekitRoom not found for dispatchStream");
            throw new Error("LivekitRoom not found for dispatchStream");
        }

        try {
            await this.livekitRoom.dispatchStream(mediaStream);
        } catch (err) {
            console.error("Error dispatching stream to Livekit room:", err);
            Sentry.captureException(err);
            throw err;
        }
    }

    getVideoForUser(spaceUserId: string): Streamable | undefined {
        return this.livekitRoom?.getVideoForUser(spaceUserId);
    }
    getScreenSharingForUser(spaceUserId: string): Streamable | undefined {
        return this.livekitRoom?.getScreenSharingForUser(spaceUserId);
    }

    destroy() {
        if (!this.livekitRoom) {
            return;
        }

        try {
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
}

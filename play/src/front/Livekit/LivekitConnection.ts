import { Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import { LivekitTokenType } from "@workadventure/messages";
import { SpaceInterface } from "../Space/SpaceInterface";
import { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { CommunicationMessageType } from "../Space/SpacePeerManager/CommunicationMessageType";
import { streamingMegaphoneStore } from "../Stores/MediaStore";
import { LiveKitRoom } from "./LiveKitRoom";
import { LiveKitRoomWatch } from "./LivekitRoomWatch";
import { LiveKitRoomStream } from "./LivekitRoomStream";

//TODO : trouver le moyen de l'avoir coté front et back , message.proto ?
export enum CommunicationType {
    NONE = "NONE",
    WEBRTC = "WEBRTC",
    LIVEKIT = "LIVEKIT",
}

export class LivekitConnection {
    private readonly unsubscribers: Subscription[] = [];
    private livekitRoomStreamer: LiveKitRoomStream | undefined;
    private livekitRoomWatcher: LiveKitRoomWatch | undefined;
    constructor(
        private space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        private _streamingMegaphoneStore = streamingMegaphoneStore
    ) {
        this.initialize();
    }

    private createLivekitRoom(serverUrl: string, token: string, tokenType: LivekitTokenType): LiveKitRoom {
        let room: LiveKitRoom;

        if (tokenType === LivekitTokenType.STREAMER) {
            this.livekitRoomStreamer = new LiveKitRoomStream(serverUrl, token);
            room = this.livekitRoomStreamer;
            this._streamingMegaphoneStore.set(true);
        } else if (tokenType === LivekitTokenType.WATCHER) {
            this.livekitRoomWatcher = new LiveKitRoomWatch(serverUrl, token, this.space, this._streamableSubjects);
            room = this.livekitRoomWatcher;
        } else {
            throw new Error("Invalid token type");
        }

        return room;
    }

    private initialize() {
        this.unsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.LIVEKIT_INVITATION_MESSAGE).subscribe((message) => {
                const serverUrl = message.livekitInvitationMessage.serverUrl;
                const token = message.livekitInvitationMessage.token;
                const tokenType = message.livekitInvitationMessage.tokenType;

                const room = this.createLivekitRoom(serverUrl, token, tokenType);

                room.prepareConnection()
                    .then(() => {
                        if (message.livekitInvitationMessage.shouldJoinRoomImmediately) {
                            room.joinRoom().catch((err) => {
                                console.error("An error occurred in executeSwitchMessage", err);
                                Sentry.captureException(err);
                            });
                        } else {
                            this.space.emitPrivateMessage(
                                {
                                    $case: "userReadyForSwitchEvent",
                                    userReadyForSwitchEvent: {
                                        strategy: CommunicationType.LIVEKIT,
                                    },
                                },
                                "0"
                            );
                        }
                    })
                    .catch((err) => {
                        console.error("An error occurred in LivekitConnection initialize", err);
                        Sentry.captureException(err);
                    });
            })
        );
        this.unsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.LIVEKIT_DISCONNECT_MESSAGE).subscribe((message) => {
                const tokenType = message.livekitDisconnectMessage.tokenType;

                if (tokenType === LivekitTokenType.STREAMER) {
                    this._streamingMegaphoneStore.set(false);
                    if (!this.livekitRoomStreamer) {
                        console.error("LivekitRoom not found");
                        Sentry.captureException(new Error("LivekitRoom not found"));
                        return;
                    }
                    this.livekitRoomStreamer?.leaveRoom();
                    this.livekitRoomStreamer?.destroy();
                    this.livekitRoomStreamer = undefined;
                } else if (tokenType === LivekitTokenType.WATCHER) {
                    if (!this.livekitRoomWatcher) {
                        console.error("LivekitRoom not found");
                        Sentry.captureException(new Error("LivekitRoom not found"));
                        return;
                    }
                    this.livekitRoomWatcher?.leaveRoom();
                    this.livekitRoomWatcher?.destroy();
                    this.livekitRoomWatcher = undefined;
                }
            })
        );
    }

    async joinRoom() {
        if (!this.livekitRoomStreamer && !this.livekitRoomWatcher) {
            console.error("LivekitRoom not found");
            Sentry.captureException(new Error("LivekitRoom not found"));
            throw new Error("LivekitRoom not found");
        }

        await this.livekitRoomStreamer?.joinRoom();
        await this.livekitRoomWatcher?.joinRoom();
    }

    async dispatchSound(url: URL): Promise<void> {
        if (!this.livekitRoomStreamer) {
            console.error("LivekitRoom not found");
            Sentry.captureException(new Error("LivekitRoom not found"));
            throw new Error("LivekitRoom not found");
        }

        await this.livekitRoomStreamer.dispatchSound(url);
    }

    async dispatchStream(mediaStream: MediaStream): Promise<void> {
        if (!this.livekitRoomStreamer) {
            console.error("LivekitRoom not found");
            Sentry.captureException(new Error("LivekitRoom not found"));
            throw new Error("LivekitRoom not found");
        }

        await this.livekitRoomStreamer.dispatchStream(mediaStream);
    }

    destroy() {
        if (!this.livekitRoomStreamer && !this.livekitRoomWatcher) {
            console.error("LivekitRoom not found");
            Sentry.captureException(new Error("LivekitRoom not found"));
            return;
        }

        this.livekitRoomStreamer?.destroy();
        this.livekitRoomWatcher?.destroy();
        this._streamingMegaphoneStore.set(false);
        for (const subscription of this.unsubscribers) {
            subscription.unsubscribe();
        }
    }
}

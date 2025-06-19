import { Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import { SpaceInterface } from "../Space/SpaceInterface";
import { StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import { CommunicationMessageType } from "../Space/SpacePeerManager/CommunicationMessageType";
import { LiveKitRoom } from "./LiveKitRoom";

//TODO : trouver le moyen de l'avoir coté front et back
export enum CommunicationType {
    NONE = "NONE",
    WEBRTC = "WEBRTC",
    LIVEKIT = "LIVEKIT",
}

export class LivekitConnection {
    private readonly unsubscribers: Subscription[] = [];
    private livekitRoom: LiveKitRoom | undefined;

    constructor(private space: SpaceInterface, private _streamableSubjects: StreamableSubjects) {
        this.initialize();
    }

    private initialize() {
        this.unsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.LIVEKIT_INVITATION_MESSAGE).subscribe((message) => {
                const serverUrl = message.livekitInvitationMessage.serverUrl;
                const token = message.livekitInvitationMessage.token;
                this.livekitRoom = new LiveKitRoom(serverUrl, token, this.space, this._streamableSubjects);

                this.livekitRoom
                    .prepareConnection()
                    .then(() => {
                        if (message.livekitInvitationMessage.shouldJoinRoomImmediately) {
                            this.joinRoom()
                                .catch((err) => {
                                    console.error("An error occurred in executeSwitchMessage", err);
                                    Sentry.captureException(err);
                                })
                                .finally(() => {});
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
            this.space.observePrivateEvent(CommunicationMessageType.LIVEKIT_DISCONNECT_MESSAGE).subscribe(() => {
                if (!this.livekitRoom) {
                    console.error("LivekitRoom not found");
                    Sentry.captureException(new Error("LivekitRoom not found"));
                    return;
                }
                this.livekitRoom.leaveRoom();
                this.livekitRoom.destroy();
                this.livekitRoom = undefined;
            })
        );
    }

    async joinRoom(): Promise<void> {
        if (!this.livekitRoom) {
            console.error("LivekitRoom not found");
            throw new Error("LivekitRoom not found");
        }

        try {
            await this.livekitRoom.joinRoom();
        } catch (err) {
            console.error("Error joining Livekit room:", err);
            Sentry.captureException(err);
            throw err;
        }
    }

    async dispatchSound(url: URL): Promise<void> {
        if (!this.livekitRoom) {
            console.error("LivekitRoom not found for dispatchSound");
            throw new Error("LivekitRoom not found for dispatchSound");
        }

        try {
            await this.livekitRoom.dispatchSound(url);
        } catch (err) {
            console.error("Error dispatching sound to Livekit room:", err);
            Sentry.captureException(err);
            throw err;
        }
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

    destroy() {
        if (!this.livekitRoom) {
            return;
        }

        try {
            this.livekitRoom.destroy();
        } catch (err) {
            console.error("Error destroying Livekit room:", err);
            Sentry.captureException(err);
        }

        for (const subscription of this.unsubscribers) {
            subscription.unsubscribe();
        }
    }
}

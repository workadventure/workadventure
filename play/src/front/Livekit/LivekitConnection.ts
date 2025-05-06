import { Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import { SpaceInterface } from "../Space/SpaceInterface";
import { CommunicationMessageType } from "../Space/SpacePeerManager/LivekitState";
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
    constructor(private space: SpaceInterface) {
        this.initialize();
    }

    private initialize() {
        this.unsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.LIVEKIT_INVITATION_MESSAGE).subscribe((message) => {
                const serverUrl = message.livekitInvitationMessage.serverUrl;
                const token = message.livekitInvitationMessage.token;
                this.livekitRoom = new LiveKitRoom(serverUrl, token, this.space);

                this.livekitRoom
                    .prepareConnection()
                    .then(() => {
                        if (message.livekitInvitationMessage.shouldJoinRoomImmediately) {
                            if (!this.livekitRoom) {
                                console.error("LivekitRoom not found");
                                Sentry.captureException(new Error("LivekitRoom not found"));
                                return;
                            }

                            console.log(">>>> joinRoom from LivekitConnection initialize");
                            this.livekitRoom.joinRoom().catch((err) => {
                                console.error("An error occurred in LivekitConnection initialize", err);
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

    joinRoom() {
        if (!this.livekitRoom) {
            console.error("LivekitRoom not found");
            Sentry.captureException(new Error("LivekitRoom not found"));
            return;
        }
        //TODO : faire une variable pour savoir si on a deja rejoint la room evite de le faire 2fois
        console.log(">>>> joinRoom from LivekitConnection executeSwitchMessage");
        this.livekitRoom.joinRoom().catch((err) => {
            console.error("An error occurred in executeSwitchMessage", err);
            Sentry.captureException(err);
        });
    }

    destroy() {
        if (!this.livekitRoom) {
            console.error("LivekitRoom not found");
            Sentry.captureException(new Error("LivekitRoom not found"));
            return;
        }

        this.livekitRoom.destroy();

        for (const subscription of this.unsubscribers) {
            subscription.unsubscribe();
        }
    }
}

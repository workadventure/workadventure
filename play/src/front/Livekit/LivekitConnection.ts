import { Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import { SpaceInterface } from "../Space/SpaceInterface";
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
            this.space.observePrivateEvent("livekitInvitationMessage").subscribe((message) => {
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
                                0
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
            this.space.observePrivateEvent("livekitDisconnectMessage").subscribe(() => {
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

        this.unsubscribers.push(
            this.space.observePrivateEvent("prepareSwitchMessage").subscribe(() => {
                if (!this.livekitRoom) {
                    console.error("LivekitRoom not found");
                    Sentry.captureException(new Error("LivekitRoom not found"));
                    return;
                }
                this.livekitRoom.prepareConnection().catch((err) => {
                    console.error("An error occurred in prepareSwitchMessage", err);
                    Sentry.captureException(err);
                });
            })
        );

        this.unsubscribers.push(
            this.space.observePrivateEvent("executeSwitchMessage").subscribe((message) => {
                if (message.executeSwitchMessage.strategy === CommunicationType.LIVEKIT) {
                    if (!this.livekitRoom) {
                        console.error("LivekitRoom not found");
                        Sentry.captureException(new Error("LivekitRoom not found"));
                        return;
                    }
                    this.livekitRoom.joinRoom().catch((err) => {
                        console.error("An error occurred in executeSwitchMessage", err);
                        Sentry.captureException(err);
                    });
                }
            })
        );
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

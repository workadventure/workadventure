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

    // Utility function to create a delay
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

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
                                .finally(() => {
                                    console.log(">>>> joinLivekitRoom");
                                    console.timeEnd(">>>> joinLivekitRoom");
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

    async joinRoom(retryCount = 3, retryDelay = 1000): Promise<void> {
        if (!this.livekitRoom) {
            console.error("LivekitRoom not found, waiting for invitation message");

            // If we're out of retries, throw the error
            if (retryCount <= 0) {
                Sentry.captureException(new Error("LivekitRoom not found after retries"));
                throw new Error("LivekitRoom not found after retries");
            }

            // Wait for a bit and retry
            console.log(`Retrying joinRoom in ${retryDelay}ms (${retryCount} retries left)`);
            await this.delay(retryDelay);
            return this.joinRoom(retryCount - 1, retryDelay);
        }

        try {
            await this.livekitRoom.joinRoom();
            console.log("Successfully joined Livekit room");
        } catch (err) {
            console.error("Error joining Livekit room:", err);

            // If we're out of retries, rethrow the error
            if (retryCount <= 0) {
                Sentry.captureException(err);
                throw err;
            }

            // Wait for a bit and retry
            console.log(`Retrying joinRoom in ${retryDelay}ms (${retryCount} retries left)`);
            await this.delay(retryDelay);
            return this.joinRoom(retryCount - 1, retryDelay);
        }
    }

    async dispatchSound(url: URL, retryCount = 3, retryDelay = 1000): Promise<void> {
        if (!this.livekitRoom) {
            console.error("LivekitRoom not found for dispatchSound, waiting for invitation message");

            // If we're out of retries, throw the error
            if (retryCount <= 0) {
                Sentry.captureException(new Error("LivekitRoom not found for dispatchSound after retries"));
                throw new Error("LivekitRoom not found for dispatchSound after retries");
            }

            // Wait for a bit and retry
            console.log(`Retrying dispatchSound in ${retryDelay}ms (${retryCount} retries left)`);
            await this.delay(retryDelay);
            return this.dispatchSound(url, retryCount - 1, retryDelay);
        }

        try {
            await this.livekitRoom.dispatchSound(url);
            console.log("Successfully dispatched sound to Livekit room");
        } catch (err) {
            console.error("Error dispatching sound to Livekit room:", err);

            // If we're out of retries, rethrow the error
            if (retryCount <= 0) {
                Sentry.captureException(err);
                throw err;
            }

            // Wait for a bit and retry
            console.log(`Retrying dispatchSound in ${retryDelay}ms (${retryCount} retries left)`);
            await this.delay(retryDelay);
            return this.dispatchSound(url, retryCount - 1, retryDelay);
        }
    }

    async dispatchStream(mediaStream: MediaStream, retryCount = 3, retryDelay = 1000): Promise<void> {
        if (!this.livekitRoom) {
            console.error("LivekitRoom not found for dispatchStream, waiting for invitation message");

            // If we're out of retries, throw the error
            if (retryCount <= 0) {
                Sentry.captureException(new Error("LivekitRoom not found for dispatchStream after retries"));
                throw new Error("LivekitRoom not found for dispatchStream after retries");
            }

            // Wait for a bit and retry
            console.log(`Retrying dispatchStream in ${retryDelay}ms (${retryCount} retries left)`);
            await this.delay(retryDelay);
            return this.dispatchStream(mediaStream, retryCount - 1, retryDelay);
        }

        try {
            await this.livekitRoom.dispatchStream(mediaStream);
            console.log("Successfully dispatched stream to Livekit room");
        } catch (err) {
            console.error("Error dispatching stream to Livekit room:", err);

            // If we're out of retries, rethrow the error
            if (retryCount <= 0) {
                Sentry.captureException(err);
                throw err;
            }

            // Wait for a bit and retry
            console.log(`Retrying dispatchStream in ${retryDelay}ms (${retryCount} retries left)`);
            await this.delay(retryDelay);
            return this.dispatchStream(mediaStream, retryCount - 1, retryDelay);
        }
    }

    destroy() {
        if (!this.livekitRoom) {
            console.log("No LivekitRoom to destroy, skipping");
            return;
        }

        try {
            this.livekitRoom.destroy();
            console.log("Successfully destroyed Livekit room");
        } catch (err) {
            console.error("Error destroying Livekit room:", err);
            Sentry.captureException(err);
        }

        for (const subscription of this.unsubscribers) {
            subscription.unsubscribe();
        }
    }
}

import { Subscription } from "rxjs";
import { get } from "svelte/store";
import { SpaceInterface, SpaceUserExtended } from "../SpaceInterface";
import { CheckedWorkAdventureMessagePort } from "../../Api/Iframe/CheckedWorkAdventureMessagePort";
import { streamingMegaphoneStore } from "../../Stores/MediaStore";

/**
 * Represents a bridge between one Space and the scripting API.
 */
export class SpaceScriptingBridge {
    private messagesSubscription: Subscription;
    private watchCount = 0;
    private userJoinedSubscription: Subscription | undefined;
    private userLeftSubscription: Subscription | undefined;
    private userUpdatedSubscription: Subscription | undefined;

    constructor(
        private space: SpaceInterface,
        private port: CheckedWorkAdventureMessagePort<"joinSpace">,
        private onSpaceLeft: () => void
    ) {
        this.messagesSubscription = this.port.messages.subscribe((event) => {
            switch (event.data.type) {
                case "watch": {
                    if (this.watchCount === 0) {
                        if (this.userJoinedSubscription) {
                            throw new Error("userJoinedSubscription is already defined, this should not happen");
                        }
                        // First, send the list of all users already in the space
                        for (const user of get(this.space.usersStore).values()) {
                            this.port.postMessage({
                                type: "onNewUser",
                                data: {
                                    ...this.toScriptingSpaceUser(user),
                                },
                            });
                        }

                        // eslint-disable-next-line @smarttools/rxjs/no-nested-subscribe
                        this.userJoinedSubscription = this.space.observeUserJoined.subscribe((user) => {
                            this.port.postMessage({
                                type: "onNewUser",
                                data: {
                                    ...this.toScriptingSpaceUser(user),
                                },
                            });
                        });

                        // eslint-disable-next-line @smarttools/rxjs/no-nested-subscribe
                        this.userLeftSubscription = this.space.observeUserLeft.subscribe((user) => {
                            this.port.postMessage({
                                type: "onDeleteUser",
                                data: {
                                    spaceUserId: user.spaceUserId,
                                },
                            });
                        });

                        // eslint-disable-next-line @smarttools/rxjs/no-nested-subscribe
                        this.userUpdatedSubscription = this.space.observeUserUpdated.subscribe((event) => {
                            this.port.postMessage({
                                type: "onUpdateUser",
                                data: {
                                    spaceUserId: event.newUser.spaceUserId,
                                    changes: event.changes,
                                    updateMask: event.updateMask,
                                },
                            });
                        });
                    }
                    this.watchCount++;
                    break;
                }
                case "unwatch": {
                    this.watchCount--;
                    if (this.watchCount === 0) {
                        if (!this.userJoinedSubscription || !this.userLeftSubscription) {
                            throw new Error(
                                "userJoinedSubscription or userLeftSubscription is not defined, this should not happen"
                            );
                        }
                        this.userJoinedSubscription.unsubscribe();
                        this.userLeftSubscription.unsubscribe();
                        this.userUpdatedSubscription?.unsubscribe();
                        this.userJoinedSubscription = undefined;
                        this.userLeftSubscription = undefined;
                        this.userUpdatedSubscription = undefined;
                    }
                    break;
                }
                case "leave": {
                    this.leave();
                    this.onSpaceLeft();
                    streamingMegaphoneStore.set(false);
                    break;
                }
                case "startStreaming": {
                    streamingMegaphoneStore.set(true);
                    this.space.emitUpdateUser({
                        megaphoneState: true,
                    });
                    break;
                }
                case "stopStreaming": {
                    this.space.emitUpdateUser({
                        megaphoneState: false,
                    });
                    streamingMegaphoneStore.set(false);
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = event.data;
                }
            }
        });
    }

    private toScriptingSpaceUser(user: SpaceUserExtended) {
        return {
            spaceUserId: user.spaceUserId,
            name: user.name,
            playUri: user.playUri,
            isLogged: user.isLogged,
            availabilityStatus: user.availabilityStatus,
            tags: user.tags,
            cameraState: user.cameraState,
            microphoneState: user.microphoneState,
            screenSharingState: user.screenSharingState,
            megaphoneState: user.megaphoneState,
            uuid: user.uuid,
            chatID: user.chatID,
            showVoiceIndicator: user.showVoiceIndicator,
        };
    }

    leave(): void {
        this.messagesSubscription.unsubscribe();
        this.userJoinedSubscription?.unsubscribe();
        this.userLeftSubscription?.unsubscribe();
        this.port.close();
        // TODO: trigger a decrement of the space user join count
    }
}

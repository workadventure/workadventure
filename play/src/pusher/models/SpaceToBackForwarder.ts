import { FilterType, PusherToBackSpaceMessage, SpaceUser, SubMessage } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import Debug from "debug";
import { Color } from "@workadventure/shared-utils";

import { Socket } from "../services/SocketManager";
import { clientEventsEmitter } from "../services/ClientEventsEmitter";
import { PartialSpaceUser, Space, SpaceUserExtended } from "./Space";

const debug = Debug("space-to-back-forwarder");

export interface SpaceToBackForwarderInterface {
    registerUser(client: Socket, filterType: FilterType): Promise<void>;
    updateUser(spaceUser: PartialSpaceUser, updateMask: string[]): void;
    unregisterUser(socket: Socket): Promise<void>;
    updateMetadata(metadata: { [key: string]: unknown }): void;
    forwardMessageToSpaceBack(pusherToBackSpaceMessage: PusherToBackSpaceMessage["message"]): void;
    syncLocalUsersWithServer(localUsers: SpaceUser[]): void;
    addUserToNotify(user: SpaceUser): void;
    deleteUserFromNotify(user: SpaceUser): void;
    leaveSpace(): void;
}

export class SpaceToBackForwarder implements SpaceToBackForwarderInterface {
    constructor(private readonly _space: Space, private readonly _clientEventsEmitter = clientEventsEmitter) {}
    async registerUser(client: Socket, filterType: FilterType): Promise<void> {
        const socketData = client.getUserData();
        const spaceUserId = socketData.spaceUserId;

        if (!spaceUserId) {
            throw new Error("Space user id not found");
        }

        if (this._space._localConnectedUser.has(spaceUserId)) {
            throw new Error("Watcher already added for user " + spaceUserId);
        }

        debug(
            `${this._space.name} : watcher added ${socketData.name}. Watcher count ${this._space._localConnectedUser.size}`
        );

        const spaceUser: SpaceUserExtended = {
            ...SpaceUser.fromPartial({
                spaceUserId,
                uuid: socketData.userUuid,
                name: socketData.name,
                playUri: socketData.roomId,
                roomName: socketData.roomName === "" ? undefined : socketData.roomName,
                availabilityStatus: socketData.availabilityStatus,
                isLogged: socketData.isLogged,
                color: Color.getColorByString(socketData.name),
                tags: socketData.tags,
                cameraState: false,
                screenSharingState: false,
                microphoneState: false,
                megaphoneState: false,
                characterTextures: socketData.characterTextures,
                visitCardUrl: socketData.visitCardUrl ?? undefined,
                chatID: socketData.chatID ?? undefined,
            }),
            lowercaseName: socketData.name.toLowerCase(),
        };

        try {
            this._space._localConnectedUserWithSpaceUser.set(client, {
                ...spaceUser,
                lowercaseName: socketData.name.toLowerCase(),
            });
            this._space._localConnectedUser.set(spaceUserId, client);
            this._clientEventsEmitter.emitClientJoinSpace(socketData.userUuid, this._space.name);

            await this._space.query.send({
                $case: "addSpaceUserQuery",
                addSpaceUserQuery: {
                    spaceName: this._space.name,
                    user: spaceUser,
                    filterType: filterType,
                },
            });

            debug(`${this._space.name} : user add sent ${spaceUser.spaceUserId}`);

            if (this._space.metadata.size > 0) {
                // Notify the client of the space metadata
                const subMessage: SubMessage = {
                    message: {
                        $case: "updateSpaceMetadataMessage",
                        updateSpaceMetadataMessage: {
                            spaceName: this._space.name,
                            metadata: JSON.stringify(this._space.metadata),
                        },
                    },
                };
                this._space.dispatcher.notifyMe(client, subMessage);
            }
        } catch (e) {
            this._space._localConnectedUser.delete(spaceUser.spaceUserId);
            this._space._localWatchers.delete(spaceUser.spaceUserId);
            this._space._localConnectedUserWithSpaceUser.delete(client);
            this._clientEventsEmitter.emitClientLeaveSpace(socketData.userUuid, this._space.name);
            throw e;
        }
    }

    updateUser(spaceUser: PartialSpaceUser, updateMask: string[]): void {
        const spaceUserId = spaceUser.spaceUserId;
        if (!spaceUserId) {
            throw new Error("spaceUserId not found");
        }

        const spaceUserFromPusher = this._space._localConnectedUser.get(spaceUserId);

        if (!spaceUserFromPusher) {
            throw new Error("spaceUser not found");
        }

        this.forwardMessageToSpaceBack({
            $case: "updateSpaceUserMessage",
            updateSpaceUserMessage: {
                spaceName: this._space.name,
                user: SpaceUser.fromPartial(spaceUser),
                updateMask,
            },
        });
    }

    async unregisterUser(socket: Socket): Promise<void> {
        const userData = socket.getUserData();

        const spaceUserId = userData.spaceUserId;
        if (!spaceUserId) {
            throw new Error("spaceUserId not found");
        }

        if (!this._space._localConnectedUser.has(spaceUserId)) {
            throw new Error("User not found in pusher local connected user");
        }

        try {
            await this._space.query.send({
                $case: "removeSpaceUserQuery",
                removeSpaceUserQuery: {
                    spaceName: this._space.name,
                    spaceUserId,
                },
            });

            this._space._localConnectedUser.delete(spaceUserId);
            this._space._localWatchers.delete(spaceUserId);
            this._space._localConnectedUserWithSpaceUser.delete(socket);
            this._clientEventsEmitter.emitClientLeaveSpace(userData.userUuid, this._space.name);

            debug(
                `${this._space.name} : watcher removed ${userData.name}. Watcher count ${this._space._localConnectedUser.size}`
            );

            debug(`${this._space.name} : user remove sent ${spaceUserId}`);
        } catch (e) {
            this._space._localConnectedUser.delete(spaceUserId);
            this._space._localConnectedUserWithSpaceUser.delete(socket);
            this._space._localWatchers.delete(spaceUserId);
            this._clientEventsEmitter.emitClientLeaveSpace(userData.userUuid, this._space.name);
            throw e;
        }
    }

    updateMetadata(metadata: { [key: string]: unknown }): void {
        this.forwardMessageToSpaceBack({
            $case: "updateSpaceMetadataMessage",
            updateSpaceMetadataMessage: {
                spaceName: this._space.name,
                metadata: JSON.stringify(metadata),
            },
        });
    }

    forwardMessageToSpaceBack(pusherToBackSpaceMessage: PusherToBackSpaceMessage["message"]): void {
        if (!this._space.spaceStreamToBackPromise) {
            throw new Error("Space stream to back not found");
        }

        this._space.spaceStreamToBackPromise
            .then((spaceStreamToBack) => {
                spaceStreamToBack.write({
                    message: pusherToBackSpaceMessage,
                });

                if (pusherToBackSpaceMessage && pusherToBackSpaceMessage.$case) {
                    this._clientEventsEmitter.emitSpaceEvent(this._space.name, pusherToBackSpaceMessage.$case);
                }
            })
            .catch((error) => {
                console.error("Error while forwarding message to space back", error);
                Sentry.captureException(error);
            });
    }

    syncLocalUsersWithServer(localUsers: SpaceUser[]): void {
        this.forwardMessageToSpaceBack({
            $case: "syncSpaceUsersMessage",
            syncSpaceUsersMessage: {
                spaceName: this._space.name,
                users: localUsers,
            },
        });
    }

    addUserToNotify(user: SpaceUser): void {
        this.forwardMessageToSpaceBack({
            $case: "addSpaceUserToNotifyMessage",
            addSpaceUserToNotifyMessage: {
                spaceName: this._space.name,
                user,
            },
        });
    }

    deleteUserFromNotify(user: SpaceUser): void {
        this.forwardMessageToSpaceBack({
            $case: "deleteSpaceUserToNotifyMessage",
            deleteSpaceUserToNotifyMessage: {
                spaceName: this._space.name,
                user,
            },
        });
    }
    leaveSpace(): void {
        this.forwardMessageToSpaceBack({
            $case: "leaveSpaceMessage",
            leaveSpaceMessage: {
                spaceName: this._space.name,
            },
        });
    }

    private getSpaceUserFromSocket(user: SpaceUser): SpaceUserExtended {
        return {
            ...user,
            lowercaseName: user.name.toLowerCase(),
        };
    }
}

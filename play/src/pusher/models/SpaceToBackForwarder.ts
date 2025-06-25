import { FilterType, PusherToBackSpaceMessage, SpaceUser, SubMessage } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import Debug from "debug";
import { Socket } from "../services/SocketManager";
import { PartialSpaceUser, Space } from "./Space";

const debug = Debug("space");

export interface SpaceToBackForwarderInterface {
    registerUser(client: Socket, filterType: FilterType): Promise<void>;
    updateUser(spaceUser: PartialSpaceUser, updateMask: string[]): void;
    unregisterUser(socket: Socket): Promise<void>;
    updateMetadata(metadata: { [key: string]: unknown }): void;
    forwardMessageToSpaceBack(pusherToBackSpaceMessage: PusherToBackSpaceMessage["message"]): void;
    syncLocalUsersWithServer(localUsers: SpaceUser[]): void;
}

export class SpaceToBackForwarder implements SpaceToBackForwarderInterface {
    constructor(private readonly _space: Space) {}
    async registerUser(client: Socket, filterType: FilterType): Promise<void> {
        const socketData = client.getUserData();
        const spaceUser = socketData.spaceUser;

        if (!socketData.spaceUser.spaceUserId) {
            throw new Error("Space user id not found");
        }
        if (this._space._localConnectedUser.has(spaceUser.spaceUserId)) {
            throw new Error("Watcher already added for user " + spaceUser.spaceUserId);
        }

        debug(
            `${this._space.name} : watcher added ${socketData.name}. Watcher count ${this._space._localConnectedUser.size}`
        );

        this._space._localConnectedUser.set(spaceUser.spaceUserId, client);

        try {
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
            throw e;
        }
    }

    updateUser(spaceUser: PartialSpaceUser, updateMask: string[]): void {
        const spaceUserId = spaceUser.spaceUserId;
        if (!spaceUserId) {
            throw new Error("spaceUserId not found");
        }
        const user = this._space._localConnectedUser.get(spaceUserId);
        if (!user) {
            throw new Error("User not found");
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

        const spaceUserId = userData.spaceUser.spaceUserId;
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

            debug(
                `${this._space.name} : watcher removed ${userData.name}. Watcher count ${this._space._localConnectedUser.size}`
            );

            debug(`${this._space.name} : user remove sent ${spaceUserId}`);
        } catch (e) {
            this._space._localConnectedUser.delete(spaceUserId);
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
}

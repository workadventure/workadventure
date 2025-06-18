import { PusherToBackSpaceMessage, SpaceUser, SubMessage } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import Debug from "debug";
import { Socket } from "../services/SocketManager";
import { PartialSpaceUser, Space } from "./Space";

const debug = Debug("space");

export interface SpaceToBackForwarderInterface {
    registerUser(client: Socket): void;
    updateUser(spaceUser: PartialSpaceUser, updateMask: string[]): void;
    unregisterUser(socket: Socket): void;
    updateMetadata(metadata: { [key: string]: unknown }): void;
    forwardMessageToSpaceBack(pusherToBackSpaceMessage: PusherToBackSpaceMessage["message"]): void;
}

export class SpaceToBackForwarder implements SpaceToBackForwarderInterface {
    constructor(private readonly _space: Space) {}
    registerUser(client: Socket): void {
        const socketData = client.getUserData();
        const spaceUser = socketData.spaceUser;
        if (!socketData.spaceUser.spaceUserId) {
            throw new Error("Space user id not found");
        }
        if (this._space._localConnectedUser.has(spaceUser.spaceUserId)) {
            throw new Error("Watcher already added for user " + spaceUser.spaceUserId);
        }
        this._space._localConnectedUser.set(spaceUser.spaceUserId, client);

        debug(
            `${this._space.name} : watcher added ${socketData.name}. Watcher count ${this._space._localConnectedUser.size}`
        );

        this.forwardMessageToSpaceBack({
            $case: "addSpaceUserMessage",
            addSpaceUserMessage: {
                spaceName: this._space.name,
                user: spaceUser,
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
                        metadata: JSON.stringify(Object.fromEntries(this._space.metadata.entries())),
                    },
                },
            };
            this._space.dispatcher.notifyMe(client, subMessage);
        }
    }
    updateUser(spaceUser: PartialSpaceUser, updateMask: string[]): void {
        this.forwardMessageToSpaceBack({
            $case: "updateSpaceUserMessage",
            updateSpaceUserMessage: {
                spaceName: this._space.name,
                user: SpaceUser.fromPartial(spaceUser),
                updateMask,
            },
        });
    }
    unregisterUser(socket: Socket): void {
        const userData = socket.getUserData();

        const spaceUserId = userData.spaceUser.spaceUserId;
        if (!spaceUserId) {
            throw new Error("spaceUserId not found");
        }

        this._space._localConnectedUser.delete(spaceUserId);
        this._space._localWatchers.delete(spaceUserId);

        debug(
            `${this._space.name} : watcher removed ${userData.name}. Watcher count ${this._space._localConnectedUser.size}`
        );

        this.forwardMessageToSpaceBack({
            $case: "removeSpaceUserMessage",
            removeSpaceUserMessage: {
                spaceName: this._space.name,
                spaceUserId,
            },
        });

        debug(`${this._space.name} : user remove sent ${spaceUserId}`);
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
        console.log("forwardMessageToSpaceBack");
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
}

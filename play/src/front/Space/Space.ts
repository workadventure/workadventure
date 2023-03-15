import { SpaceFilterMessage, SpaceUser } from "@workadventure/messages";
import { MapStore } from "@workadventure/store-utils";
import { Subscription } from "rxjs";
import { RoomConnection } from "../Connexion/RoomConnection";
import { Readable } from "svelte/store";

export class Space {
    private _users: MapStore<string, SpaceUser>;
    private subscribers: Subscription[];

    constructor(
        private connection: RoomConnection,
        readonly spaceName: string,
        private spaceFilter: SpaceFilterMessage
    ) {
        this._users = new MapStore<string, SpaceUser>();
        this.subscribers = [];
        this.subscribers.push(
            this.connection.addSpaceUserMessageStream.subscribe((message) => {
                console.log("Space => addSpaceUserMessageStream", message);
                const user = message.user;
                if (
                    message.spaceName === spaceName &&
                    message.filterName === spaceFilter.filterName &&
                    user !== undefined
                ) {
                    this._users.set(user.uuid, user);
                }
            })
        );
        this.subscribers.push(
            this.connection.updateSpaceUserMessageStream.subscribe((message) => {
                console.log("Space => updateSpaceUserMessageStream", message);
                const partialUser = message.user;
                if (
                    message.spaceName === spaceName &&
                    message.filterName === spaceFilter.filterName &&
                    partialUser !== undefined
                ) {
                    const user = this._users.get(partialUser.uuid);
                    if (user !== undefined) {
                        if (partialUser.name !== undefined) {
                            user.name = partialUser.name;
                        }
                        if (partialUser.playUri !== undefined) {
                            user.playUri = partialUser.playUri;
                        }
                        if (partialUser.color !== undefined) {
                            user.color = partialUser.color;
                        }
                        if (partialUser.characterLayers !== undefined) {
                            user.characterLayers = partialUser.characterLayers;
                        }
                        if (partialUser.isLogged !== undefined) {
                            user.isLogged = partialUser.isLogged;
                        }
                        if (partialUser.availabilityStatus !== undefined) {
                            user.availabilityStatus = partialUser.availabilityStatus;
                        }
                        if (partialUser.roomName !== undefined) {
                            user.roomName = partialUser.roomName;
                        }
                        if (partialUser.visitCardUrl !== undefined) {
                            user.visitCardUrl = partialUser.visitCardUrl;
                        }
                        if (partialUser.tags !== undefined) {
                            user.tags = partialUser.tags;
                        }
                        if (partialUser.audioSharing !== undefined) {
                            user.audioSharing = partialUser.audioSharing;
                        }
                        if (partialUser.videoSharing !== undefined) {
                            user.videoSharing = partialUser.videoSharing;
                        }
                        if (partialUser.screenSharing !== undefined) {
                            user.screenSharing = partialUser.screenSharing;
                        }
                        this._users.set(partialUser.uuid, user);
                    }
                }
            })
        );
        this.subscribers.push(
            this.connection.removeSpaceUserMessageStream.subscribe((message) => {
                console.log("Space => removeSpaceUserMessageStream", message);
                if (message.spaceName === spaceName && message.filterName === spaceFilter.filterName) {
                    this._users.delete(message.userUuid);
                }
            })
        );
    }

    public destroy() {
        this.subscribers.forEach((subscriber) => subscriber.unsubscribe());
    }

    get users(): Readable<Map<string, SpaceUser>> {
        return this._users;
    }

    get isEmpty() {
        return this._users.size === 0;
    }
}

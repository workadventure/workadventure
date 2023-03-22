import { SpaceFilterMessage, SpaceUser } from "@workadventure/messages";
import { MapStore } from "@workadventure/store-utils";
import { Subscription } from "rxjs";
import { RoomConnection } from "../Connexion/RoomConnection";
import { Readable } from "svelte/store";
import Debug from "debug";
import {CharacterLayerManager} from "../Phaser/Entity/CharacterLayerManager";
import {gameManager} from "../Phaser/Game/GameManager";

const debug = Debug("space");

export interface SpaceUserExtended extends SpaceUser{
    wokaPromise: Promise<string> | undefined;
    getWokaBase64(): Promise<string>;
}

export class Space {
    private readonly _users: MapStore<string, SpaceUserExtended>;
    private subscribers: Subscription[];

    constructor(private connection: RoomConnection, readonly name: string, private spaceFilter: SpaceFilterMessage) {
        this._users = new MapStore<string, SpaceUserExtended>();
        this.subscribers = [];
        this.subscribers.push(
            this.connection.addSpaceUserMessageStream.subscribe((message) => {
                debug(`Space => ${this.name} => addSpaceUserMessageStream`, message);
                const user = message.user;
                if (message.spaceName === name && message.filterName === spaceFilter.filterName && user !== undefined) {
                    this._users.set(user.uuid, this.extendSpaceUser(user));
                }
            })
        );
        this.subscribers.push(
            this.connection.updateSpaceUserMessageStream.subscribe((message) => {
                debug(`Space => ${this.name} => updateSpaceUserMessageStream`, message);
                const partialUser = message.user;
                if (
                    message.spaceName === name &&
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
                        if (partialUser.microphoneState !== undefined) {
                            user.microphoneState = partialUser.microphoneState;
                        }
                        if (partialUser.cameraState !== undefined) {
                            user.cameraState = partialUser.cameraState;
                        }
                        if (partialUser.megaphoneState !== undefined) {
                            user.megaphoneState = partialUser.megaphoneState;
                        }
                        if (partialUser.screenSharing !== undefined) {
                            user.screenSharing = partialUser.screenSharing;
                        }
                        if (partialUser.jitsiParticipantId !== undefined) {
                            user.jitsiParticipantId = partialUser.jitsiParticipantId;
                        }
                        this._users.set(partialUser.uuid, user);
                    }
                }
            })
        );
        this.subscribers.push(
            this.connection.removeSpaceUserMessageStream.subscribe((message) => {
                debug(`Space => ${this.name} => removeSpaceUserMessageStream`, message);
                if (message.spaceName === name && message.filterName === spaceFilter.filterName) {
                    this._users.delete(message.userUuid);
                }
            })
        );
    }

    public destroy() {
        debug(`Space => ${this.name} => destroying`);
        this.subscribers.forEach((subscriber) => subscriber.unsubscribe());
    }

    get users(): Readable<Map<string, SpaceUserExtended>> {
        return this._users;
    }

    get isEmpty() {
        return this._users.size === 0;
    }

    private extendSpaceUser(user: SpaceUser): SpaceUserExtended{
        return {
            ...user,
            wokaPromise: undefined,
            getWokaBase64(): Promise<string> {
                if (this.wokaPromise === undefined) {
                    this.wokaPromise = CharacterLayerManager.wokaBase64(user.characterLayers);
                }
                return this.wokaPromise;
            }
        }
    }
}

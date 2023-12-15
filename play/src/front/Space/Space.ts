import { PartialSpaceUser, SpaceFilterMessage, SpaceUser } from "@workadventure/messages";
import { MapStore } from "@workadventure/store-utils";
import debug from "debug";
import { Subject, Subscription } from "rxjs";
import { Readable } from "svelte/store";
import { z } from "zod";
import { RoomConnection } from "../Connection/RoomConnection";
import { CharacterLayerManager } from "../Phaser/Entity/CharacterLayerManager";

export interface SpaceUserExtended extends SpaceUser {
    wokaPromise: Promise<string> | undefined;
    getWokaBase64(): Promise<string>;
    updateSubject: Subject<{
        newUser: SpaceUserExtended;
        changes: PartialSpaceUser;
    }>;
}

const spaceLogger = debug("Space");
export class Space {
    private readonly _users: MapStore<number, SpaceUserExtended>;
    private readonly _metadata: MapStore<string, unknown>;
    private subscribers: Subscription[];

    constructor(private connection: RoomConnection, readonly name: string, private spaceFilter: SpaceFilterMessage) {
        this._users = new MapStore<number, SpaceUserExtended>();
        this._metadata = new MapStore<string, unknown>();
        this.subscribers = [];
        this.subscribers.push(
            this.connection.addSpaceUserMessageStream.subscribe((message) => {
                spaceLogger(`Space => ${this.name} => addSpaceUserMessageStream`, message);
                const user = message.user;
                if (message.spaceName === name && message.filterName === spaceFilter.filterName && user !== undefined) {
                    this._users.set(user.id, this.extendSpaceUser(user));
                }
            })
        );
        this.subscribers.push(
            this.connection.updateSpaceUserMessageStream.subscribe((message) => {
                spaceLogger(`Space => ${this.name} => updateSpaceUserMessageStream`, message);
                const partialUser = message.user;
                if (
                    message.spaceName === name &&
                    message.filterName === spaceFilter.filterName &&
                    partialUser !== undefined
                ) {
                    const user = this._users.get(partialUser.id);
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
                        if (partialUser.characterTextures !== undefined) {
                            user.characterTextures = partialUser.characterTextures;
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
                        if (partialUser.screenSharingState !== undefined) {
                            user.screenSharingState = partialUser.screenSharingState;
                        }
                        if (partialUser.jitsiParticipantId !== undefined) {
                            user.jitsiParticipantId = partialUser.jitsiParticipantId;
                        }
                        if (partialUser.uuid !== undefined) {
                            user.uuid = partialUser.uuid;
                        }
                        user.updateSubject.next({
                            newUser: user,
                            changes: partialUser,
                        });
                        console.log("updateSpaceUserMessageStream", user);
                        this._users.set(partialUser.id, user);
                    }
                }
            })
        );
        this.subscribers.push(
            this.connection.removeSpaceUserMessageStream.subscribe((message) => {
                spaceLogger(`Space => ${this.name} => removeSpaceUserMessageStream`, message);
                if (message.spaceName === name && message.filterName === spaceFilter.filterName) {
                    const user = this._users.get(message.userId);
                    if (user !== undefined) {
                        user.updateSubject.complete();
                        this._users.delete(message.userId);
                    }
                }
            })
        );
        this.subscribers.push(
            this.connection.updateSpaceMetadataMessageStream.subscribe((message) => {
                spaceLogger(`Space => ${this.name} => updateSpaceMetadataMessageStream`, message);
                const isMetadata = z.record(z.string(), z.unknown()).safeParse(JSON.parse(message.metadata));
                if (!isMetadata.success) {
                    console.error("Error while parsing metadata", isMetadata.error);
                    return;
                }

                if (message.spaceName === name) {
                    for (const [key, value] of Object.entries(isMetadata.data)) {
                        this._metadata.set(key, value);
                    }
                }
            })
        );
    }

    public destroy() {
        spaceLogger(`Space => ${this.name} => destroying`);
        this.subscribers.forEach((subscriber) => subscriber.unsubscribe());
    }

    get users(): Readable<Map<number, SpaceUserExtended>> {
        return this._users;
    }

    get metadata(): Readable<Map<string, unknown>> {
        return this._metadata;
    }

    get isEmpty() {
        return this._users.size === 0;
    }

    private extendSpaceUser(user: SpaceUser): SpaceUserExtended {
        return {
            ...user,
            wokaPromise: undefined,
            getWokaBase64(): Promise<string> {
                if (this.wokaPromise === undefined) {
                    this.wokaPromise = CharacterLayerManager.wokaBase64(user.characterTextures);
                }
                return this.wokaPromise;
            },
            updateSubject: new Subject<{
                newUser: SpaceUserExtended;
                changes: PartialSpaceUser;
            }>(),
        };
    }
}

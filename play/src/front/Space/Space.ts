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
    roomConnection: RoomConnection;
    spaceName: string;
}

const spaceLogger = debug("Space");

//spaceWatcher
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

                if (message.user === undefined) return;
                if (!this.isTargetThisSpace(message.spaceName, message.filterName)) return;

                const user = message.user;
                this._users.set(user.id, this.extendSpaceUser(user));
            })
        );
        this.subscribers.push(
            this.connection.updateSpaceUserMessageStream.subscribe((message) => {
                spaceLogger(`Space => ${this.name} => updateSpaceUserMessageStream`, message);

                if (!this.isTargetThisSpace(message.spaceName, message.filterName)) return;

                const partialUser = message.user;
                if (partialUser === undefined) return;

                let user = this._users.get(partialUser.id);
                if (user === undefined) return;

                user = {
                    ...user,
                    ...partialUser,
                } as SpaceUserExtended;

                user.updateSubject.next({
                    newUser: user,
                    changes: partialUser,
                });
                this._users.set(partialUser.id, user);
            })
        );
        this.subscribers.push(
            this.connection.removeSpaceUserMessageStream.subscribe((message) => {
                spaceLogger(`Space => ${this.name} => removeSpaceUserMessageStream`, message);
                if (!this.isTargetThisSpace(message.spaceName, message.filterName)) return;
                const user = this._users.get(message.userId);
                if (user !== undefined) {
                    user.updateSubject.complete();
                    this._users.delete(message.userId);
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

    isTargetThisSpace(spaceName: string, filterName: string | undefined): boolean {
        if (this.spaceFilter.filterName === filterName && this.name === spaceName) return true;
        return false;
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
            roomConnection: this.connection,
            spaceName: this.name,
        };
    }
}

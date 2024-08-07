import merge from "lodash/merge";
import { SpaceFilterMessage, SpaceUser } from "@workadventure/messages";
import { Subject } from "rxjs";
import { Readable, get, readable, writable, Writable } from "svelte/store";
import { CharacterLayerManager } from "../../Phaser/Entity/CharacterLayerManager";
import { RoomConnection } from "../../Connection/RoomConnection";

export interface SpaceFilterInterface {
    userExist(userId: number): boolean;
    addUser(user: SpaceUser): Promise<SpaceUserExtended>;
    usersStore: Readable<Map<number, SpaceUserExtended>>;
    removeUser(userId: number): void;
    updateUserData(userdata: Partial<SpaceUser>): void;
    setFilter(filter: Filter): void;
    getName(): string;
    getFilterType(): NonNullable<SpaceFilterMessage["filter"]>["$case"];
}

type ReactiveSpaceUser = {
    [K in keyof Omit<SpaceUser, "id">]: Readonly<Readable<SpaceUser[K]>>;
} & {
    id: number;
    playUri: string | undefined;
    roomName: string | undefined;
};

export type SpaceUserExtended = SpaceUser & {
    wokaPromise: Promise<string> | undefined;
    getWokaBase64: string;
    updateSubject: Subject<{
        newUser: SpaceUserExtended;
        changes: SpaceUser;
        updateMask: string[];
    }>;
    emitter: JitsiEventEmitter | undefined;
    spaceName: string;
    reactiveUser: ReactiveSpaceUser;
};

export type Filter = SpaceFilterMessage["filter"];

export interface JitsiEventEmitter {
    emitKickOffUserMessage(userId: string): void;
    emitMuteEveryBodySpace(): void;
    emitMuteVideoEveryBodySpace(): void;
    emitMuteParticipantIdSpace(userId: string): void;
    emitMuteVideoParticipantIdSpace(userId: string): void;
    emitProximityPublicMessage(message: string): void;
    emitProximityPrivateMessage(message: string, receiverUserId: number): void;
}

export class SpaceFilter implements SpaceFilterInterface {
    private _setUsers: ((value: Map<number, SpaceUserExtended>) => void) | undefined;
    readonly usersStore: Readable<Map<number, Readonly<SpaceUserExtended>>>;
    private _users: Map<number, SpaceUserExtended> = new Map<number, SpaceUserExtended>();
    private isSubscribe = false;

    constructor(
        private _name: string,
        private _spaceName: string,
        private _connection: RoomConnection,
        private _filter: Filter = undefined
    ) {
        this.usersStore = readable(new Map<number, SpaceUserExtended>(), (set) => {
            this.addSpaceFilter();
            this._setUsers = set;
            set(this._users);
            this.isSubscribe = true;

            return () => {
                this.removeSpaceFilter();
                this.isSubscribe = false;
            };
        });
    }
    userExist(userId: number): boolean {
        return get(this.usersStore).has(userId);
    }
    async addUser(user: SpaceUser): Promise<SpaceUserExtended> {
        const extendSpaceUser = await this.extendSpaceUser(user, this._spaceName);

        if (!this.userExist(user.id)) {
            this._users.set(user.id, extendSpaceUser);
            if (this._setUsers) {
                this._setUsers(this._users);
            }
        }

        return extendSpaceUser;
    }

    getUsers(): SpaceUserExtended[] {
        return Array.from(get(this.usersStore).values());
    }
    removeUser(userId: number): void {
        if (!this.userExist(userId)) {
            this._users.delete(userId);
            if (this._setUsers) {
                this._setUsers(this._users);
            }
        }
    }

    updateUserData(newData: Partial<SpaceUser>): void {
        if (!newData.id && newData.id !== 0) return;

        if (!this._setUsers) {
            throw new Error("");
        }

        const userToUpdate = this._users.get(newData.id);

        if (!userToUpdate) return;

        //TODO : Use fieldMask to update user
        merge(userToUpdate, newData);

        for (const key in newData) {
            // We allow ourselves a not 100% exact type cast here.
            // Technically, newData could contain any key, not only keys part of SpaceUser type (because additional keys
            // are allowed in Javascript objects)
            // However, we know for sure that the keys of newData are part of SpaceUser type, so we can safely cast them.
            const castKey = key as keyof typeof newData;
            // Out of security, we add a runtime check to ensure that the key is part of SpaceUser type
            if (castKey in userToUpdate.reactiveUser) {
                // Finally, we cast the "Readable" to "Writable" to be able to update the value. We know for sure it is
                // writable because the only place that can create a "ReactiveSpaceUser" is the "extendSpaceUser" method.
                const store = userToUpdate.reactiveUser[castKey];
                if (typeof store === "object" && "set" in store) {
                    (store as Writable<unknown>).set(newData[castKey]);
                }
            }
        }

        this._setUsers(this._users);
    }

    setFilter(newFilter: Filter) {
        this._filter = newFilter;
        if (this.isSubscribe) {
            this.updateSpaceFilter();
        }
    }
    getName(): string {
        return this._name;
    }

    private async extendSpaceUser(user: SpaceUser, spaceName: string): Promise<SpaceUserExtended> {
        let emitter = undefined;

        emitter = {
            emitKickOffUserMessage: (userId: string) => {
                this._connection.emitKickOffUserMessage(userId, this._name);
            },
            // FIXME: it is strange to have a emitMuteEveryBodySpace that is valid for anyone in a space applied to a specific user. It should be a method of the space instead.
            // In fact, we should have a single "emitPublicMessage" on the space class with a typing that is a union of all possible messages addressed to everybody.
            emitMuteEveryBodySpace: () => {
                this._connection.emitMuteEveryBodySpace(this._name);
            },
            emitMuteParticipantIdSpace: (userId: string) => {
                this._connection.emitMuteParticipantIdSpace(this._name, userId);
            },
            // FIXME: it is strange to have a emitMuteVideoEveryBodySpace that is valid for anyone in a space applied to a specific user. It should be a method of the space instead.
            // In fact, we should have a single "emitPublicMessage" on the space class with a typing that is a union of all possible messages addressed to everybody.
            emitMuteVideoEveryBodySpace: () => {
                this._connection.emitMuteVideoEveryBodySpace(this._name);
            },
            emitMuteVideoParticipantIdSpace: (userId: string) => {
                this._connection.emitMuteParticipantIdSpace(this._name, userId);
            },
            emitProximityPublicMessage: (message: string) => {
                this._connection.emitProximityPublicMessage(this._name, message);
            },
            emitProximityPrivateMessage: (message: string, receiverUserId: number) => {
                this._connection.emitProximityPrivateMessage(this._name, message, receiverUserId);
            },
        };

        const wokaBase64 = await CharacterLayerManager.wokaBase64(user.characterTextures);

        const extendedUser = {
            ...user,
            wokaPromise: undefined,
            getWokaBase64: wokaBase64,
            updateSubject: new Subject<{
                newUser: SpaceUserExtended;
                changes: SpaceUser;
                updateMask: string[];
            }>(),
            emitter,
            spaceName,
        } as unknown as SpaceUserExtended;

        extendedUser.reactiveUser = new Proxy(
            {
                id: extendedUser.id,
                roomName: extendedUser.roomName,
                playUri: extendedUser.playUri,
            } as unknown as ReactiveSpaceUser,
            {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                get(target: any, property: PropertyKey, receiver: unknown) {
                    if (typeof property !== "string") {
                        return Reflect.get(target, property, receiver);
                    }

                    if (target[property as keyof ReactiveSpaceUser]) {
                        return target[property as keyof ReactiveSpaceUser];
                    } else {
                        if (property in extendedUser) {
                            //@ts-ignore
                            target[property] = writable(extendedUser[property]);
                            return target[property];
                        } else {
                            return Reflect.get(target, property, receiver);
                        }
                    }
                },
            }
        );

        return extendedUser;
    }

    private removeSpaceFilter() {
        this._connection.emitRemoveSpaceFilter({
            spaceFilterMessage: {
                filterName: this._name,
                spaceName: this._spaceName,
            },
        });
    }

    private updateSpaceFilter() {
        this._connection.emitUpdateSpaceFilter({
            spaceFilterMessage: {
                filterName: this._name,
                spaceName: this._spaceName,
                filter: this._filter,
            },
        });
    }
    private addSpaceFilter() {
        this._connection.emitAddSpaceFilter({
            spaceFilterMessage: {
                filterName: this._name,
                spaceName: this._spaceName,
                filter: this._filter,
            },
        });
    }

    getFilterType(): "spaceFilterEverybody" | "spaceFilterContainName" | "spaceFilterLiveStreaming" | undefined {
        return this._filter?.$case;
    }
}

import merge from "lodash/merge";
import { PrivateSpaceEvent, SpaceFilterMessage, SpaceUser } from "@workadventure/messages";
import { Observable, Subject, Subscriber } from "rxjs";
import { Readable, get, readable, writable, Writable } from "svelte/store";
import { applyFieldMask } from "protobuf-fieldmask";
import { CharacterLayerManager } from "../../Phaser/Entity/CharacterLayerManager";
import { SpaceInterface } from "../SpaceInterface";
import { RoomConnectionForSpacesInterface } from "../SpaceRegistry/SpaceRegistry";

// FIXME: refactor from the standpoint of the consumer. addUser, removeUser should be removed...
export interface SpaceFilterInterface {
    //userExist(userId: number): boolean;
    //addUser(user: SpaceUser): Promise<SpaceUserExtended>;
    readonly usersStore: Readable<Map<string, SpaceUserExtended>>;
    //removeUser(userId: number): void;
    //updateUserData(userdata: Partial<SpaceUser>): void;
    getName(): string;

    /**
     * Use this observer to get a description of new users.
     * It can be easier than subscribing to the usersStore and trying to deduce who the new user is.
     */
    readonly observeUserJoined: Observable<SpaceUserExtended>;
    /**
     * Use this observer to get a description of users who left.
     * It can be easier than subscribing to the usersStore and trying to deduce who the gone user is.
     */
    readonly observeUserLeft: Observable<SpaceUserExtended>;
}

type ReactiveSpaceUser = {
    [K in keyof Omit<SpaceUser, "spaceUserId">]: Readonly<Readable<SpaceUser[K]>>;
} & {
    spaceUserId: string;
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
    emitPrivateEvent: (message: NonNullable<PrivateSpaceEvent["event"]>) => void;
    //emitter: JitsiEventEmitter | undefined;
    space: SpaceInterface;
    reactiveUser: ReactiveSpaceUser;
};

export type Filter = SpaceFilterMessage["filter"];

// export interface JitsiEventEmitter {
//     emitKickOffUserMessage(userId: string): void;
//     emitMuteEveryBodySpace(): void;
//     emitMuteVideoEveryBodySpace(): void;
//     emitMuteParticipantIdSpace(userId: string): void;
//     emitMuteVideoParticipantIdSpace(userId: string): void;
//     emitProximityPublicMessage(message: string): void;
//     emitProximityPrivateMessage(message: string, receiverUserId: number): void;
// }

export abstract class SpaceFilter implements SpaceFilterInterface {
    private _setUsers: ((value: Map<string, SpaceUserExtended>) => void) | undefined;
    readonly usersStore: Readable<Map<string, Readonly<SpaceUserExtended>>>;
    private _users: Map<string, SpaceUserExtended> = new Map<string, SpaceUserExtended>();
    private isSubscribe = false;
    private _addUserSubscriber: Subscriber<SpaceUserExtended> | undefined;
    private _leftUserSubscriber: Subscriber<SpaceUserExtended> | undefined;
    public readonly observeUserJoined: Observable<SpaceUserExtended>;
    public readonly observeUserLeft: Observable<SpaceUserExtended>;
    private registerRefCount = 0;

    protected constructor(
        private _name: string,
        private _space: SpaceInterface,
        private _connection: RoomConnectionForSpacesInterface,
        private _filter: Filter
    ) {
        this.usersStore = readable(new Map<string, SpaceUserExtended>(), (set) => {
            this.registerSpaceFilter();
            this._setUsers = set;
            set(this._users);
            this.isSubscribe = true;

            return () => {
                this.unregisterSpaceFilter();
                this.isSubscribe = false;
            };
        });

        this.observeUserJoined = new Observable<SpaceUserExtended>((subscriber) => {
            this.registerSpaceFilter();
            this._addUserSubscriber = subscriber;

            return () => {
                this.unregisterSpaceFilter();
            };
        });

        this.observeUserLeft = new Observable<SpaceUserExtended>((subscriber) => {
            this.registerSpaceFilter();
            this._leftUserSubscriber = subscriber;

            return () => {
                this.unregisterSpaceFilter();
            };
        });
    }
    async addUser(user: SpaceUser): Promise<SpaceUserExtended> {
        const extendSpaceUser = await this.extendSpaceUser(user);

        if (!this._users.has(user.spaceUserId)) {
            this._users.set(user.spaceUserId, extendSpaceUser);
            if (this._setUsers) {
                this._setUsers(this._users);
            }
            if (this._addUserSubscriber) {
                this._addUserSubscriber.next(extendSpaceUser);
            }
        }

        return extendSpaceUser;
    }

    getUsers(): SpaceUserExtended[] {
        return Array.from(get(this.usersStore).values());
    }
    removeUser(spaceUserId: string): void {
        const user = this._users.get(spaceUserId);
        if (user) {
            this._users.delete(spaceUserId);
            if (this._setUsers) {
                this._setUsers(this._users);
            }
            if (this._leftUserSubscriber) {
                this._leftUserSubscriber.next(user);
            }
        }
    }

    updateUserData(newData: SpaceUser, updateMask: string[]): void {
        if (!newData.spaceUserId && newData.spaceUserId !== "") return;

        const userToUpdate = this._users.get(newData.spaceUserId);

        if (!userToUpdate) return;

        const maskedNewData = applyFieldMask(newData, updateMask);

        merge(userToUpdate, maskedNewData);

        for (const key in maskedNewData) {
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

        /*if (this._setUsers) {
            this._setUsers(this._users);
        }*/
    }

    protected setFilter(newFilter: Filter) {
        this._filter = newFilter;
        if (this.isSubscribe) {
            this.updateSpaceFilter();
        }
    }
    getName(): string {
        return this._name;
    }

    private async extendSpaceUser(user: SpaceUser): Promise<SpaceUserExtended> {
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
            //emitter,
            emitPrivateEvent: (message: NonNullable<PrivateSpaceEvent["event"]>) => {
                this._connection.emitPrivateSpaceEvent(this._space.getName(), message, user.spaceUserId);
            },
            space: this._space,
        } as unknown as SpaceUserExtended;

        extendedUser.reactiveUser = new Proxy(
            {
                spaceUserId: extendedUser.spaceUserId,
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
                            //@ts-ignore We check just above that the property is in extendedUser
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

    private unregisterSpaceFilter() {
        this.registerRefCount--;
        if (this.registerRefCount === 0) {
            this._connection.emitRemoveSpaceFilter({
                spaceFilterMessage: {
                    filterName: this._name,
                    spaceName: this._space.getName(),
                },
            });
        }
    }

    private updateSpaceFilter() {
        this._connection.emitUpdateSpaceFilter({
            spaceFilterMessage: {
                filterName: this._name,
                spaceName: this._space.getName(),
                filter: this._filter,
            },
        });
    }
    private registerSpaceFilter() {
        if (this.registerRefCount === 0) {
            this._connection.emitAddSpaceFilter({
                spaceFilterMessage: {
                    filterName: this._name,
                    spaceName: this._space.getName(),
                    filter: this._filter,
                },
            });
        }
        this.registerRefCount++;
    }
}

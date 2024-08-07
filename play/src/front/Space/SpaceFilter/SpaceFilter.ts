import merge from "lodash/merge";
import {
    SpaceFilterContainName,
    SpaceFilterEverybody,
    SpaceFilterLiveStreaming,
    SpaceUser,
} from "@workadventure/messages";
import { Subject } from "rxjs";
import { Readable, get, readable, writable } from "svelte/store";
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
    getFilterType(): "spaceFilterEverybody" | "spaceFilterContainName" | "spaceFilterLiveStreaming" | undefined;
}

type ReactiveSpaceUser = {
    [K in keyof SpaceUser]: Readable<SpaceUser[K]>;
};

type SpaceUserExtended = SpaceUser & {
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

export type Filter =
    | {
          $case: "spaceFilterEverybody";
          spaceFilterEverybody: SpaceFilterEverybody;
      }
    | {
          $case: "spaceFilterContainName";
          spaceFilterContainName: SpaceFilterContainName;
      }
    | {
          $case: "spaceFilterLiveStreaming";
          spaceFilterLiveStreaming: SpaceFilterLiveStreaming;
      }
    | undefined;

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
    private setUsers: ((value: Map<number, SpaceUserExtended>) => void) | undefined;
    readonly usersStore: Readable<Map<number, SpaceUserExtended>>;
    private users : Map<number, SpaceUserExtended> = new Map<number, SpaceUserExtended>() ;

    constructor(
        private _name: string,
        private _spaceName: string,
        private _connection: RoomConnection,
        private _filter: Filter = undefined,
    ) {
        this.usersStore = readable(new Map<number, SpaceUserExtended>(), (set) => {
            this.setUsers = set;
        });
    }
    userExist(userId: number): boolean {
        return get(this.usersStore).has(userId);
    }
    async addUser(user: SpaceUser): Promise<SpaceUserExtended> {
        const extendSpaceUser = await this.extendSpaceUser(user, this._spaceName);

        if(!this.setUsers){
            throw new Error("");
        }

        if (!this.userExist(user.id)){
            this.users.set(user.id, extendSpaceUser);
            this.setUsers(this.users);
        } 

        return extendSpaceUser;
    }

    getUsers(): SpaceUserExtended[] {
        return Array.from(get(this.usersStore).values());
    }
    removeUser(userId: number): void {
        if(!this.setUsers){
            throw new Error("");
        }

        this.users.delete(userId);
        this.setUsers(this.users)
    }

    updateUserData(newData: Partial<SpaceUser>): void {
        if (!newData.id && newData.id !== 0) return;

        if(!this.setUsers){
            throw new Error("");
        }

        const userToUpdate = this.users.get(newData.id);

        if (!userToUpdate) return;
        merge(userToUpdate, newData);

        this.setUsers(this.users);

    }

    setFilter(newFilter: Filter) {
        this._filter = newFilter;
        this.updateSpaceFilter();
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

        /*const reactiveUser: Partial<ReactiveSpaceUser> = {};
        for (const key in user) {
            if(this.isKeyOf(reactiveUser,key)){
                const storeKey: keyof ReactiveSpaceUser = key as keyof ReactiveSpaceUser;
                reactiveUser[storeKey] = writable(user[key]);
            }

        }*/
        /*const reactiveUser: any = {};
        for (const key in user) {
            reactiveUser[key] = writable(user[key]);
        }*/
        const reactiveUser = Object.fromEntries(
            Object.entries(user).map(([key, value]) => [key, writable(value)])
        ) as unknown as ReactiveSpaceUser;

        return {
            ...user,
            reactiveUser,
            wokaPromise: undefined,
            getWokaBase64: wokaBase64,
            updateSubject: new Subject<{
                newUser: SpaceUserExtended;
                changes: SpaceUser;
                updateMask: string[];
            }>(),
            emitter,
            spaceName,
        };
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
            },
        });
    }

    getFilterType(): "spaceFilterEverybody" | "spaceFilterContainName" | "spaceFilterLiveStreaming" | undefined {
        return this._filter?.$case;
    }
    destroy() {
        this.removeSpaceFilter();
    }
}

import merge from "lodash/merge";
import {
    SpaceFilterContainName,
    SpaceFilterEverybody,
    SpaceFilterLiveStreaming,
    SpaceUser,
} from "@workadventure/messages";
import { Subject } from "rxjs";
import { Writable, get, writable } from "svelte/store";
import { CharacterLayerManager } from "../../Phaser/Entity/CharacterLayerManager";
import { RoomConnection } from "../../Connection/RoomConnection";

export interface SpaceFilterInterface {
    userExist(userId: number): boolean;
    addUser(user: SpaceUser): Promise<SpaceUserExtended>;
    getUsers(): SpaceUserExtended[];
    users: Writable<Map<number, SpaceUserExtended>>;
    getUser(userId: number): SpaceUser | null;
    removeUser(userId: number): void;
    updateUserData(userdata: Partial<SpaceUser>): void;
    setFilter(filter: Filter): void;
    getName(): string;
    getFilterType(): "spaceFilterEverybody" | "spaceFilterContainName" | "spaceFilterLiveStreaming" | undefined;
    destroy(): void;
}

export interface SpaceUserExtended extends SpaceUser {
    wokaPromise: Promise<string> | undefined;
    getWokaBase64: string;
    updateSubject: Subject<{
        newUser: SpaceUserExtended;
        changes: SpaceUser;
        updateMask: string[];
    }>;
    emitter: JitsiEventEmitter | undefined;
    spaceName: string;
}

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
    constructor(
        private _name: string,
        private _spaceName: string,
        private _connection: RoomConnection,
        private _filter: Filter = undefined,
        readonly users: Writable<Map<number, SpaceUserExtended>> = writable(new Map<number, SpaceUserExtended>())
    ) {
        this.addSpaceFilter();
    }
    userExist(userId: number): boolean {
        return get(this.users).has(userId);
    }
    async addUser(user: SpaceUser): Promise<SpaceUserExtended> {
        const extendSpaceUser = await this.extendSpaceUser(user, this._spaceName);
        this.users.update((value) => {
            if (!this.userExist(user.id)) value.set(user.id, extendSpaceUser);
            return value;
        });
        return extendSpaceUser;
    }

    getUser(userId: number): SpaceUser | null {
        return get(this.users).get(userId) || null;
    }

    getUsers(): SpaceUserExtended[] {
        return Array.from(get(this.users).values());
    }
    removeUser(userId: number): boolean {
        let isDeleted = false;
        this.users.update((value) => {
            isDeleted = value.delete(userId);
            return value;
        });

        return isDeleted;
    }

    updateUserData(newData: Partial<SpaceUser>): void {
        if (!newData.id && newData.id !== 0) return;
        const userToUpdate = get(this.users).get(newData.id);
        if (!userToUpdate) return;
        merge(userToUpdate, newData);
        this.users.update((value) => {
            value.set(userToUpdate.id, userToUpdate);
            return value;
        });
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

        return {
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

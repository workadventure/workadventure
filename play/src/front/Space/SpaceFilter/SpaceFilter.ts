import merge from "lodash/merge";
import {
    PartialSpaceUser,
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
        changes: PartialSpaceUser;
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
        private name: string,
        private spaceName: string,
        private filter: Filter = undefined,
        private roomConnection: RoomConnection,
        readonly users: Writable<Map<number, SpaceUserExtended>> = writable(new Map<number, SpaceUserExtended>())
    ) {
        this.addSpaceFilter();
    }
    userExist(userId: number): boolean {
        return get(this.users).has(userId);
    }
    async addUser(user: SpaceUser): Promise<SpaceUserExtended> {
        const extendSpaceUser = await this.extendSpaceUser(user, this.spaceName);
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
        this.filter = newFilter;
        this.updateSpaceFilter();
    }
    getName(): string {
        return this.name;
    }

    private async extendSpaceUser(user: SpaceUser, spaceName: string): Promise<SpaceUserExtended> {
        let emitter = undefined;

        emitter = {
            emitKickOffUserMessage: (userId: string) => {
                this.emitKickOffUserMessage(userId);
            },
            emitMuteEveryBodySpace: () => {
                this.emitMuteEveryBodySpace();
            },
            emitMuteParticipantIdSpace: (userId: string) => {
                this.emitMuteParticipantIdSpace(userId);
            },
            emitMuteVideoEveryBodySpace: () => {
                this.emitMuteVideoEveryBodySpace();
            },
            emitMuteVideoParticipantIdSpace: (userId: string) => {
                this.emitMuteVideoParticipantIdSpace(userId);
            },
            emitProximityPublicMessage: (message: string) => {
                this.emitProximityPublicMessage(message);
            },
            emitProximityPrivateMessage: (message: string, receiverUserId: number) => {
                this.emitProximityPrivateMessage(message, receiverUserId);
            },
        };

        const wokaBase64 = await CharacterLayerManager.wokaBase64(user.characterTextures);

        return {
            ...user,
            wokaPromise: undefined,
            getWokaBase64: wokaBase64,
            updateSubject: new Subject<{
                newUser: SpaceUserExtended;
                changes: PartialSpaceUser;
            }>(),
            emitter,
            spaceName,
        };
    }
    private removeSpaceFilter() {
        this.roomConnection.emitRemoveSpaceFilter({
            spaceFilterMessage: {
                filterName: this.name,
                spaceName: this.spaceName,
            },
        });
    }

    private updateSpaceFilter() {
        this.roomConnection.emitUpdateSpaceFilter({
            spaceFilterMessage: {
                filterName: this.name,
                spaceName: this.spaceName,
                filter: this.filter,
            },
        });
    }
    private addSpaceFilter() {
        this.roomConnection.emitAddSpaceFilter({
            spaceFilterMessage: {
                filterName: this.name,
                spaceName: this.spaceName,
            },
        });
    }

    private emitKickOffUserMessage(userId: string) {
        this.roomConnection.emitKickOffUserMessage(userId, this.spaceName);
    }

    private emitMuteEveryBodySpace() {
        this.roomConnection.emitMuteEveryBodySpace(this.spaceName);
    }

    private emitMuteVideoEveryBodySpace() {
        this.roomConnection.emitMuteVideoEveryBodySpace(this.spaceName);
    }

    private emitMuteParticipantIdSpace(userId: string) {
        this.roomConnection.emitMuteParticipantIdSpace(userId, this.spaceName);
    }

    private emitMuteVideoParticipantIdSpace(userId: string) {
        this.roomConnection.emitMuteVideoParticipantIdSpace(userId, this.spaceName);
    }

    private emitProximityPublicMessage(message: string) {
        this.roomConnection.emitProximityPublicMessage(this.spaceName, message);
    }

    private emitProximityPrivateMessage(message: string, receiverUserId: number) {
        this.roomConnection.emitProximityPrivateMessage(this.spaceName, message, receiverUserId);
    }

    getFilterType(): "spaceFilterEverybody" | "spaceFilterContainName" | "spaceFilterLiveStreaming" | undefined {
        return this.filter?.$case;
    }
    destroy() {
        this.removeSpaceFilter();
    }
}

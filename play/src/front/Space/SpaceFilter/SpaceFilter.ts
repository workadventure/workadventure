import merge from "lodash/merge";
import {
    ClientToServerMessage,
    PartialSpaceUser,
    SpaceFilterContainName,
    SpaceFilterEverybody,
    SpaceFilterLiveStreaming,
    SpaceFilterMessage,
    SpaceUser,
} from "@workadventure/messages";
import { Subject } from "rxjs";
import { Writable, get, writable } from "svelte/store";
import { CharacterLayerManager } from "../../Phaser/Entity/CharacterLayerManager";

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
    getFilterType(): "spaceFilterEverybody" | "spaceFilterContainName" | "spaceFilterLiveStreaming"| undefined;
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
}

export class SpaceFilter implements SpaceFilterInterface {
    constructor(
        private name: string,
        private spaceName: string,
        private filter: Filter = undefined,
        private sender: (message: ClientToServerMessage) => void,
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
                this.emitMuteEveryBodySpace(user.id.toString());
            },
            emitMuteParticipantIdSpace: (userId: string) => {
                this.emitMuteParticipantIdSpace(userId);
            },
            emitMuteVideoEveryBodySpace: () => {
                this.emitMuteVideoEveryBodySpace(user.id.toString());
            },
            emitMuteVideoParticipantIdSpace: (userId: string) => {
                this.emitMuteVideoParticipantIdSpace(userId);
            },
        };

        const wokaBase64 = await CharacterLayerManager.wokaBase64(user.characterTextures) ;
        
        return {
            ...user,
            wokaPromise: undefined,
            getWokaBase64: wokaBase64 ,
            updateSubject: new Subject<{
                newUser: SpaceUserExtended;
                changes: PartialSpaceUser;
            }>(),
            emitter,
            spaceName,
        };
    }
    private removeSpaceFilter(spaceFilter: SpaceFilterMessage) {
        this.sender({
            message: {
                $case: "removeSpaceFilterMessage",
                removeSpaceFilterMessage: {
                    spaceFilterMessage: {
                        filterName: this.name,
                        spaceName: this.spaceName,
                    },
                },
            },
        });
    }
    private updateSpaceFilter() {
        this.sender({
            message: {
                $case: "updateSpaceFilterMessage",
                updateSpaceFilterMessage: {
                    spaceFilterMessage: {
                        filterName: this.name,
                        spaceName: this.spaceName,
                        filter: this.filter,
                    },
                },
            },
        });
    }
    private addSpaceFilter() {
        this.sender({
            message: {
                $case: "addSpaceFilterMessage",
                addSpaceFilterMessage: {
                    spaceFilterMessage: {
                        filterName: this.name,
                        spaceName: this.spaceName,
                    },
                },
            },
        });
    }
    private emitKickOffUserMessage(userId: string) {
        this.sender({
            message: {
                $case: "kickOffUserMessage",
                kickOffUserMessage: {
                    userId,
                    spaceName: this.spaceName,
                },
            },
        });
    }

    private emitMuteEveryBodySpace(userId: string) {
        this.sender({
            message: {
                $case: "muteEveryBodyParticipantMessage",
                muteEveryBodyParticipantMessage: {
                    spaceName: this.spaceName,
                    senderUserId: userId,
                },
            },
        });
    }

    private emitMuteVideoEveryBodySpace(userId: string) {
        this.sender({
            message: {
                $case: "muteVideoEveryBodyParticipantMessage",
                muteVideoEveryBodyParticipantMessage: {
                    spaceName: this.spaceName,
                    userId: userId,
                },
            },
        });
    }

    private emitMuteParticipantIdSpace(userId: string) {
        this.sender({
            message: {
                $case: "muteParticipantIdMessage",
                muteParticipantIdMessage: {
                    spaceName: this.spaceName,
                    mutedUserUuid: userId,
                },
            },
        });
    }

    private emitMuteVideoParticipantIdSpace(userId: string) {
        this.sender({
            message: {
                $case: "muteVideoParticipantIdMessage",
                muteVideoParticipantIdMessage: {
                    spaceName: this.spaceName,
                    mutedUserUuid: userId,
                },
            },
        });
    }

    getFilterType(): "spaceFilterEverybody" | "spaceFilterContainName" | "spaceFilterLiveStreaming"| undefined {
        return this.filter?.$case;
    }
    destroy() {
        this.removeSpaceFilter({
            spaceName: this.spaceName,
            filterName: this.name,
        });
    }
}

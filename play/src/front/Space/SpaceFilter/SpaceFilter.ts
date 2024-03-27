import {
    PartialSpaceUser,
    SpaceFilterContainName,
    SpaceFilterEverybody,
    SpaceFilterLiveStreaming,
    SpaceFilterMessage,
    SpaceUser,
} from "@workadventure/messages";
import { Subject } from "rxjs";
import { Writable, get, writable } from "svelte/store";
import { SpaceFilterEventEmitterInterface } from "../SpaceEventEmitter/SpaceEventEmitterInterface";
import { CharacterLayerManager } from "../../Phaser/Entity/CharacterLayerManager";

export interface SpaceFilterInterface {
    userExist(userId: number): boolean;
    addUser(user: SpaceUser): void;
    getUsers(): SpaceUser[];
    users: Writable<Map<number, SpaceUserExtended>>;
    getUser(userId: number): SpaceUser | null;
    removeUser(userId: number): void;
    updateUserData(userdata: Partial<SpaceUser>): void;
    setFilter(filter: Filter): void;
    getName(): string;
    destroy(): void;
}

export interface SpaceUserExtended extends SpaceUser {
    wokaPromise: Promise<string> | undefined;
    getWokaBase64(): Promise<string>;
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
    emitKickOffUserMessage(): void;
    emitMuteEveryBodySpace(): void;
    emitMuteVideoEveryBodySpace(): void;
    emitMuteParticipantIdSpace(): void;
    emitMuteVideoParticipantIdSpace(): void;
}

export class SpaceFilter implements SpaceFilterInterface {
    private jitsiEventEmitter: JitsiEventEmitter | undefined = undefined;
    constructor(
        private name: string,
        private spaceName: string,
        private filter: Filter = undefined,
        private spaceFilterEventEmitter: SpaceFilterEventEmitterInterface | undefined = undefined,
        readonly users: Writable<Map<number, SpaceUserExtended>> = writable(new Map<number, SpaceUserExtended>())
    ) {
        const spaceFilterMessage: SpaceFilterMessage = {
            filterName: name,
            spaceName: spaceName,
        };
        if (!spaceFilterEventEmitter) return;
        spaceFilterEventEmitter.addSpaceFilter(spaceFilterMessage);
    }
    userExist(userId: number): boolean {
        return get(this.users).has(userId);
    }
    addUser(user: SpaceUser): void {
        const extendSpaceUser = this.extendSpaceUser(user, this.spaceName);
        this.users.update((value) => {
            if (!this.userExist(user.id)) value.set(user.id, extendSpaceUser);
            return value;
        });
    }

    getUser(userId: number): SpaceUser | null {
        return get(this.users).get(userId) || null;
    }

    getUsers(): SpaceUser[] {
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
        this.users.update((value) => {
            value.set(userToUpdate.id, {
                ...userToUpdate,
                ...newData,
            });
            return value;
        });
    }

    setFilter(newFilter: Filter) {
        this.filter = newFilter;
        if (this.spaceFilterEventEmitter)
            this.spaceFilterEventEmitter.updateSpaceFilter({
                filter: newFilter,
                spaceName: this.spaceName,
                filterName: this.name,
            });
    }
    getName(): string {
        return this.name;
    }

    private extendSpaceUser(user: SpaceUser, spaceName: string): SpaceUserExtended {
        let emitter = undefined;
        if (this.spaceFilterEventEmitter) {
            const {
                emitKickOffUserMessage,
                emitMuteEveryBodySpace,
                emitMuteVideoEveryBodySpace,
                emitMuteParticipantIdSpace,
                emitMuteVideoParticipantIdSpace,
            } = this.spaceFilterEventEmitter;

            emitter = {
                emitKickOffUserMessage: () => {
                    emitKickOffUserMessage(spaceName, user.id.toString());
                },
                emitMuteEveryBodySpace: () => {
                    emitMuteEveryBodySpace(spaceName);
                },
                emitMuteParticipantIdSpace: () => {
                    emitMuteParticipantIdSpace(spaceName, user.id.toString());
                },
                emitMuteVideoEveryBodySpace: () => {
                    emitMuteVideoEveryBodySpace(spaceName);
                },
                emitMuteVideoParticipantIdSpace: () => {
                    emitMuteVideoParticipantIdSpace(spaceName, user.id.toString());
                },
            };
        }

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
            emitter,
            spaceName,
        };
    }

    destroy() {
        if (this.spaceFilterEventEmitter)
            this.spaceFilterEventEmitter.removeSpaceFilter({
                spaceName: this.spaceName,
                filterName: this.name,
            });
    }
}

import type { Readable } from "svelte/store";
import { readable, writable } from "svelte/store";
import type { ChatMember } from "@workadventure/messages";
import { AvailabilityStatus } from "@workadventure/messages";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import type { PartialChatUser } from "../Connection/ChatConnection";
import type { RoomConnection } from "../../Connection/RoomConnection";
import type { UserProviderInterface } from "./UserProviderInterface";

export class AdminUserProvider implements UserProviderInterface {
    users: Readable<PartialChatUser[]>;
    private currentSearchText = "";
    private setUsers: ((users: PartialChatUser[]) => void) | undefined;
    private cachedUsers: PartialChatUser[] | undefined;
    private queryAbortController: AbortController | undefined;

    constructor(private connection: RoomConnection) {
        this.users = readable([] as PartialChatUser[], (set) => {
            this.setUsers = set;

            // The first time we subscribe to this store, we make a request to the server to fetch the list of members from the Admin API
            // The result is cached, so that subsequent subscriptions to this store don't trigger additional requests to the server.
            // The cache is invalidated when the filter is changed.
            if (this.cachedUsers !== undefined) {
                set(this.cachedUsers);
            } else if (!this.queryAbortController) {
                this.loadUsers(this.currentSearchText).catch((error) => console.error(error));
            }

            return () => {
                this.setUsers = undefined;
            };
        });
    }

    private mapChatMembersToChatUser(chatMembers: ChatMember[]): PartialChatUser[] {
        return chatMembers.reduce((userAcc, currentMember) => {
            if (currentMember.chatId)
                userAcc.push({
                    availabilityStatus: writable(AvailabilityStatus.UNCHANGED),
                    pictureStore: readable(undefined),
                    chatId: currentMember.chatId,
                    roomName: undefined,
                    playUri: undefined,
                    username: currentMember.wokaName,
                    isAdmin: currentMember.tags.includes("admin"),
                    isMember: currentMember.tags.includes("member"),
                    uuid: undefined,
                    color: undefined,
                    spaceUserId: undefined,
                });
            return userAcc;
        }, [] as PartialChatUser[]);
    }

    async setFilter(searchText: string): Promise<void> {
        this.currentSearchText = searchText;
        this.cachedUsers = undefined;
        this.abortPendingRequest();

        if (!this.setUsers) {
            return;
        }

        await this.loadUsers(searchText);
    }

    private async loadUsers(searchText: string): Promise<void> {
        const abortController = new AbortController();
        this.queryAbortController = abortController;

        try {
            const { members } = await this.connection.queryChatMembers(searchText, abortController.signal);
            const users = this.mapChatMembersToChatUser(members);

            if (this.currentSearchText !== searchText || this.queryAbortController !== abortController) {
                return;
            }

            this.cachedUsers = users;
            this.setUsers?.(users);
        } catch (error) {
            if (error instanceof AbortError) {
                return;
            }
            throw new Error("An error occurred while processing chat members: " + error, { cause: error });
        } finally {
            if (this.queryAbortController === abortController) {
                this.queryAbortController = undefined;
            }
        }
    }

    private abortPendingRequest(): void {
        if (!this.queryAbortController || this.queryAbortController.signal.aborted) {
            return;
        }

        this.queryAbortController.abort(new AbortError("Chat members query superseded"));
        this.queryAbortController = undefined;
    }
}

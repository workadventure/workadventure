import type { Writable } from "svelte/store";
import { readable, writable } from "svelte/store";
import type { ChatMember } from "@workadventure/messages";
import { AvailabilityStatus } from "@workadventure/messages";
import type { PartialChatUser } from "../Connection/ChatConnection";
import type { RoomConnection } from "../../Connection/RoomConnection";
import type { UserProviderInterface } from "./UserProviderInterface";

export class AdminUserProvider implements UserProviderInterface {
    users: Writable<PartialChatUser[]>;
    private _setUsers: ((value: PartialChatUser[]) => void) | undefined;

    constructor(private connection: RoomConnection) {
        this.users = writable([] as PartialChatUser[], (set) => {
            this._setUsers = set;
            connection
                .queryChatMembers("")
                .then(({ members }) => {
                    set(this.mapChatMembersToChatUser(members));
                })
                .catch((error) => {
                    throw new Error("An error occurred while processing chat members: " + error);
                });
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

    setFilter(searchText: string): Promise<void> {
        return new Promise((res, rej) => {
            this.connection
                .queryChatMembers(searchText)
                .then(({ members }) => {
                    if (this._setUsers) {
                        this._setUsers(this.mapChatMembersToChatUser(members));
                        res();
                    }
                })
                .catch((error) => {
                    rej(new Error("An error occurred while processing chat members: " + error));
                });
        });
    }
}

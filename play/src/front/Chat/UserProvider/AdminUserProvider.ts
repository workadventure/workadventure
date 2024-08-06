import { Writable, writable } from "svelte/store";
import { AvailabilityStatus, ChatMembersAnswer } from "@workadventure/messages";
import { ChatUser, PartialChatUser } from "../Connection/ChatConnection";
import { UserProvideInterface } from "./UserProvideInterface";

export class AdminUserProvider implements UserProvideInterface {
    users: Writable<PartialChatUser[]> = writable([]);

    constructor(ChatMembersPromise: Promise<ChatMembersAnswer>) {
        ChatMembersPromise.then(({ members }) => {
            const userFromAdmin = members.reduce((userAcc, currentMember) => {
                if (currentMember.chatId)
                    userAcc.push({
                        availabilityStatus: writable(AvailabilityStatus.UNCHANGED),
                        avatarUrl: undefined,
                        id: currentMember.chatId,
                        roomName: undefined,
                        playUri: undefined,
                        username: currentMember.wokaName,
                        isAdmin: currentMember.tags.includes("admin"),
                        isMember: currentMember.tags.includes("member"),
                        uuid: undefined,
                        color: undefined,
                        spaceId: undefined,
                    });

                return userAcc;
            }, [] as ChatUser[]);

            this.users.set(userFromAdmin);
        }).catch((error) => {
            throw new Error("An error occurred while processing chat members: " + error);
        });
    }
}

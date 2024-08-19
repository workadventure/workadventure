import { Writable, writable } from "svelte/store";
import { AvailabilityStatus, ChatMembersAnswer } from "@workadventure/messages";
import { ChatUser, PartialChatUser } from "../Connection/ChatConnection";
import { UserProvideInterface } from "./UserProvideInterface";

export class AdminUserProvider implements UserProvideInterface {
    users: Writable<PartialChatUser[]> = writable([]);

    constructor(chatMembersPromise: Promise<ChatMembersAnswer>) {
        // TODO: pass the connection in parameter.
        // Make the request to the admin ONLY when the store is subscribed to.
        // This means the store should be a readable and not a writable.
        chatMembersPromise
            .then(({ members }) => {
                const userFromAdmin = members.reduce((userAcc, currentMember) => {
                    if (currentMember.chatId)
                        userAcc.push({
                            availabilityStatus: writable(AvailabilityStatus.UNCHANGED),
                            avatarUrl: undefined,
                            chatId: currentMember.chatId,
                            roomName: undefined,
                            playUri: undefined,
                            username: currentMember.wokaName,
                            isAdmin: currentMember.tags.includes("admin"),
                            isMember: currentMember.tags.includes("member"),
                            uuid: undefined,
                            color: undefined,
                            id: undefined,
                        });

                    return userAcc;
                }, [] as ChatUser[]);

                this.users.set(userFromAdmin);
            })
            .catch((error) => {
                throw new Error("An error occurred while processing chat members: " + error);
            });
    }
}

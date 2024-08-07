import {  Writable, writable } from "svelte/store";
import { AvailabilityStatus, ChatMember } from "@workadventure/messages";
import { ChatUser, PartialChatUser } from "../Connection/ChatConnection";
import { UserProvideInterface } from "./UserProvideInterface";
import { RoomConnection } from "../../Connection/RoomConnection";

export class AdminUserProvider implements UserProvideInterface {
    users: Writable<PartialChatUser[]>;

    constructor(private connection : RoomConnection) {
        this.users = writable([] as PartialChatUser[] ,(set)=>{
            connection.queryChatMembers("")
            .then(({ members }) => {
                set(this.mapChatMembersToChatUser(members));
            })
            .catch((error) => {
                throw new Error("An error occurred while processing chat members: " + error);
            });
        });
    }
    
    searchUsers(username : string) : Promise<void>{
        return new Promise((res,rej)=>{
            this.connection
            .queryChatMembers(username)
            .then(({ members })=>{
                res()
                this.users.set(this.mapChatMembersToChatUser(members));
            })
            .catch((error)=>{
                rej("An error occurred while processing chat members: " + error);
            })
        })

    }

    private mapChatMembersToChatUser(chatMembers : ChatMember[]){
        return chatMembers.reduce((userAcc, currentMember) => {
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
    }

}

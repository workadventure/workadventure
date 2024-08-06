import { Readable, derived, writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { PartialChatUser } from "../Connection/ChatConnection";
import { SpaceFilterInterface } from "../../Space/SpaceFilter/SpaceFilter";
import { UserProvideInterface } from "./UserProvideInterface";

export class WorldUserProvider implements UserProvideInterface {
    users: Readable<PartialChatUser[]>;
    constructor(allUsersInWorldSpaceFilter: SpaceFilterInterface) {
        const usersFromFilter = allUsersInWorldSpaceFilter.users;

        this.users = derived(usersFromFilter, (users) => {
            return Array.from(users.values()).map((currentUser) => {
                return {
                    uuid: currentUser.uuid,
                    chatId: currentUser.chatID ?? "",
                    avatarUrl: currentUser.getWokaBase64,
                    availabilityStatus: writable(AvailabilityStatus.ONLINE),
                    roomName: currentUser.roomName,
                    playUri: currentUser.playUri,
                    username: currentUser.name,
                    isAdmin: currentUser.tags.includes("admin"),
                    isMember: currentUser.tags.includes("member"),
                    visitCardUrl: currentUser.visitCardUrl,
                    color: currentUser.color,
                    id: currentUser.id,
                };
            });
        });
    }
}

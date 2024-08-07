import { Readable, derived, writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { PartialChatUser } from "../Connection/ChatConnection";
import { SpaceInterface } from "../../Space/SpaceInterface";
import { CONNECTED_USER_FILTER_NAME } from "../../Space/Space";
import { UserProvideInterface } from "./UserProvideInterface";

export class WorldUserProvider implements UserProvideInterface {
    users: Readable<PartialChatUser[]>;
    constructor(allUsersInWorldSpace: SpaceInterface) {
        const userFromSpace = allUsersInWorldSpace.getSpaceFilter(CONNECTED_USER_FILTER_NAME).users;

        this.users = derived(
            userFromSpace,
            (users) => {
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
            },
            []
        );
    }
}

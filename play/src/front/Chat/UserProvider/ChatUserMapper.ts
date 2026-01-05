import type { AdminUser } from "../Connection/ChatConnection";
import type { SpaceUserExtended } from "../../Space/SpaceInterface";

export function mapExtendedSpaceUserToChatUser(user: SpaceUserExtended): AdminUser {
    return {
        uuid: user.uuid,
        chatId: user.chatID,
        pictureStore: user.pictureStore,
        availabilityStatus: user.reactiveUser.availabilityStatus,
        roomName: user.roomName,
        playUri: user.playUri,
        username: user.name,
        isAdmin: user.tags.includes("admin"),
        isMember: user.tags.includes("member"),
        visitCardUrl: user.visitCardUrl,
        color: user.color,
        spaceUserId: user.spaceUserId,
    };
}

import { ChatUser } from "../Connection/ChatConnection";
import { SpaceUserExtended } from "../../Space/SpaceFilter/SpaceFilter";

export function mapExtendedSpaceUserToChatUser(user: SpaceUserExtended): ChatUser {
    return {
        uuid: user.uuid,
        chatId: user.chatID ?? user.uuid,
        avatarUrl: user.getWokaBase64,
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

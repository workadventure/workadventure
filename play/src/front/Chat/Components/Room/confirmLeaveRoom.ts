import { get } from "svelte/store";
import LL from "../../../../i18n/i18n-svelte";
import { localUserStore } from "../../../Connection/LocalUserStore";
import { notificationPlayingStore } from "../../../Stores/NotificationStore";
import { draftMessageService } from "../../Services/DraftMessageService";
import type { ChatRoom, ChatRoomMembershipManagement, ChatRoomModeration } from "../../Connection/ChatConnection";
import { ChatPermissionLevel } from "../../Connection/ChatConnection";
import ConfirmDialog from "../ConfirmDialog.svelte";
import { modals } from "@wa-modals";

type LeavableRoom = ChatRoom & ChatRoomMembershipManagement & ChatRoomModeration;

/** True when nobody else could manage the room once the current user, an admin, leaves it. */
export function isLastAdmin(room: LeavableRoom): boolean {
    if (!get(room.isCurrentUserRoomAdmin)) {
        return false;
    }
    const admins = get(room.members).filter(
        (member) => get(member.membership) === "join" && get(member.permissionLevel) === ChatPermissionLevel.ADMIN,
    );
    return admins.length <= 1;
}

/** Asks before leaving a room, warns the last admin, and only then leaves (failures stay in the popup). */
export function confirmLeaveRoom(room: LeavableRoom): void {
    const translations = get(LL);
    modals.open(ConfirmDialog, {
        heading: translations.chat.confirm.leaveRoomTitle({ name: get(room.name) }),
        message: translations.chat.confirm.leaveRoomMessage(),
        warning: isLastAdmin(room) ? translations.chat.confirm.lastAdminWarning() : undefined,
        confirmLabel: translations.chat.confirm.leaveRoom(),
        danger: true,
        onConfirm: async () => {
            await room.leaveRoom();
            draftMessageService.deleteDraft(`${room.id}-${localUserStore.getChatId() ?? "0"}`);
            notificationPlayingStore.playNotification(translations.chat.roomMenu.leaveRoom.notification());
        },
    });
}

import { gameManager } from "../../../Phaser/Game/GameManager";
import { chatNotificationStore } from "../../../Stores/ProximityNotificationStore";
import type { ProximityChatRoom } from "../../Connection/Proximity/ProximityChatRoom";
import { selectedRoomStore } from "../../Stores/SelectRoomStore";

export function selectProximityRoom(room: ProximityChatRoom): void {
    selectedRoomStore.set(room);
    gameManager.getCurrentGameScene().proximityChatRoomManager.selectRoom(room);
    room.hasUnreadMessages.set(false);
    room.unreadMessagesCount.set(0);
    room.unreadNotificationCount.set(0);
    chatNotificationStore.clearRoom(room.id);
}

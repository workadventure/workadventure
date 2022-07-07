import {
    BatchToPusherRoomMessage,
    EditMapMessage,
    ModifyAreaMessage,
    SubToPusherRoomMessage,
} from "../Messages/generated/messages_pb";
import { RoomSocket } from "../RoomManager";

export class MapEditorMessagesHandler {
    private roomListeners: Set<RoomSocket>;

    constructor(roomListeners: Set<RoomSocket>) {
        this.roomListeners = roomListeners;
    }

    public handleModifyAreaMessage(message: ModifyAreaMessage) {
        const editMapMessage = new EditMapMessage();
        editMapMessage.setModifyareamessage(message);

        const subMessage = new SubToPusherRoomMessage();
        subMessage.setEditmapmessage(editMapMessage);

        const batchMessage = new BatchToPusherRoomMessage();
        batchMessage.addPayload(subMessage);
        // Dispatch the message on the room listeners
        for (const socket of this.roomListeners) {
            socket.write(batchMessage);
        }
    }
}

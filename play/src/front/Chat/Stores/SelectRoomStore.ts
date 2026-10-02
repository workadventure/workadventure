import { get, writable } from "svelte/store";
import type { ChatConversation } from "../Connection/ChatConnection";
import { matrixSecurity } from "../Connection/Matrix/MatrixSecurity";
import { chatVisibilityStore } from "../../Stores/ChatStore";
import { selectedThreadStore } from "./SelectedThreadStore";
import { roomSidePanelStore } from "./RoomSidePanelStore";

const createSelectedRoomStore = () => {
    const { subscribe, update } = writable<ChatConversation | undefined>(undefined);
    let isOpen = false;

    const customSet = (value: ChatConversation | undefined) => {
        update((currentValue) => {
            value?.ensureTimelineInitialized?.().catch((error) => {
                console.error("Failed to initialize selected room", error);
            });
            if (currentValue !== value && value && get(value.isEncrypted) && !isOpen && get(chatVisibilityStore)) {
                isOpen = true;
                matrixSecurity
                    .openAutomaticChooseDeviceVerificationMethodModal()
                    .catch((error) => {
                        console.error(error);
                    })
                    .finally(() => {
                        isOpen = false;
                    });
            }

            roomSidePanelStore.syncWithRoom(value);
            selectedThreadStore.syncWithRoom(value);
            return value;
        });
    };

    return {
        subscribe,
        set: customSet,
    };
};

export const selectedRoomStore = createSelectedRoomStore();

/**
 * A membership change (e.g. accepting an invitation) destroys the room's previous wrapper and rebuilds a
 * fresh one during placement reconciliation — in the connection lists (root/folder placement) or inside a
 * space folder's own children rebuild ({@link MatrixRoomFolder.getChildren}). Any UI still bound to the old,
 * now-destroyed wrapper stops receiving live timeline events: a message the user sends is delivered to the
 * server but never renders until the room is re-opened. Whenever a replacement wrapper for the selected room
 * is created, repoint `selectedRoomStore` at it so the open timeline keeps updating.
 */
export function retargetSelectedRoomIfReplaced(newRoom: ChatConversation): void {
    if (get(selectedRoomStore)?.id === newRoom.id) {
        selectedRoomStore.set(newRoom);
    }
}

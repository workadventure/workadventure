import { get, writable } from "svelte/store";
import type { ChatConversation } from "../Connection/ChatConnection";
import { matrixSecurity } from "../Connection/Matrix/MatrixSecurity";
import { chatVisibilityStore } from "../../Stores/ChatStore";
import { selectedThreadStore } from "./SelectedThreadStore";

const createSelectedRoomStore = () => {
    const { subscribe, update } = writable<ChatConversation | undefined>(undefined);
    let isOpen = false;

    const customSet = (value: ChatConversation | undefined) => {
        update((currentValue) => {
            if (currentValue !== value && value && get(value.isEncrypted) && !isOpen && get(chatVisibilityStore)) {
                isOpen = true;
                matrixSecurity
                    .openChooseDeviceVerificationMethodModal()
                    .catch((error) => {
                        console.error(error);
                    })
                    .finally(() => {
                        isOpen = false;
                    });
            }

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

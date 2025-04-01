import { get, writable } from "svelte/store";
import type { ChatRoom } from "../Connection/ChatConnection";
import { matrixSecurity } from "../Connection/Matrix/MatrixSecurity";
import { chatVisibilityStore } from "../../Stores/ChatStore";

const createSelectedRoomStore = () => {
    const { subscribe, update } = writable<ChatRoom | undefined>(undefined);
    let isOpen = false;

    const customSet = (value: ChatRoom | undefined) => {
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

            return value;
        });
    };

    return {
        subscribe,
        set: customSet,
    };
};

export const selectedRoomStore = createSelectedRoomStore();

import { get, writable } from "svelte/store";
import type { ChatRoom } from "../Connection/ChatConnection";
import { matrixSecurity } from "../Connection/Matrix/MatrixSecurity";
import { alreadyAskForInitCryptoConfiguration } from "./AlreadyAskForInitCryptoConfigurationStore";

const createSelectedRoomStore = () => {
    const { subscribe, update } = writable<ChatRoom | undefined>(undefined);

    const customSet = (value: ChatRoom | undefined) => {
        update((currentValue) => {
            if (
                currentValue !== value &&
                value &&
                get(value.isEncrypted) &&
                !get(alreadyAskForInitCryptoConfiguration)
            ) {
                matrixSecurity.openChooseDeviceVerificationMethodModal().catch((error) => {
                    console.error(error);
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

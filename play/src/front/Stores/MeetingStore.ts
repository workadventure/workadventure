import { get, writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { gameManager } from "../Phaser/Game/GameManager";

export interface AskDialog {
    uuid: string;
    spaceUserId: string;
    message: string;
    userName?: string;
    avatarUrl?: string;
    callback?: () => void;
}

/**
 * Create a store for the ask dialog to mute user
 */
function createAskDialogStore() {
    const { subscribe, set } = writable<Set<AskDialog>>(new Set());

    return {
        subscribe,
        addAskDialog: (
            spaceUserId: string,
            message: string,
            callback?: () => void,
            userName?: string,
            avatarUrl?: string
        ) => {
            const askDialogs = get(askDialogStore);
            askDialogs.add({ uuid: uuidv4(), spaceUserId, message, userName, avatarUrl, callback });
            set(askDialogs);
        },
        acceptAskDialog: (uuid: string) => {
            const askDialogs = get(askDialogStore);
            // find the askDialog with the userId
            const askDialog = Array.from(askDialogs).find((askDialog) => askDialog.uuid === uuid);
            if (!askDialog) return;

            askDialog.callback?.();
            askDialogs.delete(askDialog);
            set(askDialogs);
        },
        refuseAskDialog: (uuid: string) => {
            const askDialogs = get(askDialogStore);
            // find the askDialog with the userId
            const askDialog = Array.from(askDialogs).find((askDialog) => askDialog.uuid === uuid);
            if (!askDialog) return;

            askDialogs.delete(askDialog);
            set(askDialogs);
        },
        closeDialogByUserId: (userId: number) => {
            const spaceUserId = gameManager.getCurrentGameScene().roomUrl + "_" + userId;
            const askDialogs = get(askDialogStore);
            // find the askDialog with the userId
            const askDialog = Array.from(askDialogs).find((askDialog) => askDialog.spaceUserId === spaceUserId);
            if (!askDialog) return;

            askDialogs.delete(askDialog);
            set(askDialogs);
        },
        closeAllDialog: () => {
            set(new Set());
        },
    };
}

export const askDialogStore = createAskDialogStore();

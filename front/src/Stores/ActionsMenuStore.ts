import { writable } from "svelte/store";
import { string } from "zod";

export interface ActionsMenuData {
    playerName: string;
    actions: Map<string, { actionName: string; callback: Function }>;
}

function createActionsMenuStore() {
    const { subscribe, update, set } = writable<ActionsMenuData | undefined>(undefined);

    return {
        subscribe,
        initialize: (playerName: string) => {
            set({
                playerName,
                actions: new Map<string, { actionName: string; callback: Function }>(),
            });
        },
        addAction: (actionName: string, callback: Function) => {
            update((data) => {
                data?.actions.set(actionName, { actionName, callback });
                return data;
            });
        },
        removeAction: (actionName: string) => {
            update((data) => {
                data?.actions.delete(actionName);
                return data;
            });
        },
        /**
         * Hides menu
         */
        clear: () => {
            set(undefined);
        },
    };
}

export const actionsMenuStore = createActionsMenuStore();

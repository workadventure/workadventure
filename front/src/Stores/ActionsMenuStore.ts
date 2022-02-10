import { writable } from "svelte/store";

export interface ActionsMenuData {
    playerName: string;
    actions: { actionName: string; callback: Function }[];
}

function createActionsMenuStore() {
    const { subscribe, update, set } = writable<ActionsMenuData | undefined>(undefined);

    return {
        subscribe,
        initialize: (playerName: string) => {
            set({
                playerName,
                actions: [],
            });
        },
        addAction: (actionName: string, callback: Function) => {
            update((data) => {
                data?.actions.push({ actionName, callback });
                return data;
            });
        },
        removeAction: (actionName: string) => {
            update((data) => {
                const actionIndex = data?.actions.findIndex((action) => action.actionName === actionName);
                if (actionIndex !== undefined && actionIndex != -1) {
                    data?.actions.splice(actionIndex, 1);
                }
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

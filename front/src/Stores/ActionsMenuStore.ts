import { writable } from "svelte/store";

export interface ActionsMenuInterface {
    displayName: string;
    callback: Function;
}

function createActionsMenuStore() {

    const actions = new Map<string, ActionsMenuInterface>();
    const { subscribe, update, set } = writable<Map<string, ActionsMenuInterface>>(actions);

    return {
        subscribe,
        addPossibleAction: (key: string, displayName: string, callback: Function) => {
            update((actions) => {
                actions.set(key, { displayName, callback });
                return actions;
            });
        },
        removePossibleAction: (key: string) => {
            update((actions) => {
                actions.delete(key);
                return actions;
            });
        },
        /**
         * Hides menu
         */
        clearActions: () => {
            set(new Map<string, ActionsMenuInterface>());
        }
    };
}

export const actionsMenuStore = createActionsMenuStore();
import { writable } from "svelte/store";

export type ActionsMenuAction = {
    actionName: string;
    callback: () => void;
    protected?: boolean;
    priority?: number;
    style?: "is-success" | "is-error" | "is-primary";
};
export interface ActionsMenuData {
    menuName: string;
    actions: Map<string, ActionsMenuAction>;
}

function createActionsMenuStore() {
    const { subscribe, update, set } = writable<ActionsMenuData | undefined>(undefined);

    return {
        subscribe,
        initialize: (menuName: string) => {
            set({
                menuName,
                actions: new Map<string, ActionsMenuAction>(),
            });
        },
        addAction: (action: ActionsMenuAction) => {
            update((data) => {
                data?.actions.set(action.actionName, action);
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

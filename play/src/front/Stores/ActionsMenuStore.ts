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
    actions: ActionsMenuAction[];
}

function createActionsMenuStore() {
    const { subscribe, update, set } = writable<ActionsMenuData | undefined>(undefined);

    return {
        subscribe,
        initialize: (menuName: string) => {
            set({
                menuName,
                actions: new Array<ActionsMenuAction>(),
            });
        },
        addAction: (action: ActionsMenuAction) => {
            update((data) => {
                data?.actions.push(action);
                return data;
            });
        },
        removeAction: (actionName: string) => {
            update((data) => {
                const index = data?.actions.findIndex((action) => (action.actionName = actionName));
                if (index && index !== -1) {
                    data?.actions.splice(index, 1);
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

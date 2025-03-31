import { writable } from "svelte/store";
import { v4 } from "uuid";

export type ActionsMenuAction = {
    uuid?: string;
    actionName: string;
    callback: () => void;
    protected?: boolean;
    priority?: number;
    style?: "is-success" | "is-error" | "is-primary" | string;
    actionIcon?: string;
    iconColor?: string;
};
export interface ActionsMenuData {
    menuName: string;
    menuDescription?: string;
    actions: ActionsMenuAction[];
    visitCardUrl?: string;
}

function createActionsMenuStore() {
    const { subscribe, update, set } = writable<ActionsMenuData | undefined>(undefined);

    return {
        subscribe,
        initialize: (menuName: string, menuDescription?: string) => {
            set({
                menuName,
                menuDescription,
                actions: new Array<ActionsMenuAction>(),
                visitCardUrl: undefined,
            });
        },
        setVisitCardUrl: (visitCardUrl: string) => {
            update((data) => {
                if (data) {
                    data.visitCardUrl = visitCardUrl;
                }
                return data;
            });
        },
        addAction: (action: ActionsMenuAction) => {
            update((data) => {
                const dataWithUuid = { ...action, uuid: action.uuid ?? v4() };
                data?.actions.push(dataWithUuid);
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

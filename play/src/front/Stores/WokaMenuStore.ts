import { writable } from "svelte/store";
import { v4 } from "uuid";

export type WokaMenuAction = {
    uuid?: string;
    actionName: string;
    callback: () => void;
    protected?: boolean;
    priority?: number;
    style?: "is-success" | "is-error" | "is-primary" | string;
    actionIcon?: string;
    iconColor?: string;
};
export interface WokaMenuData {
    wokaName: string;
    actions: WokaMenuAction[];
    visitCardUrl?: string;
    userId: number;
}

function createWokaMenuStore() {
    const { subscribe, update, set } = writable<WokaMenuData | undefined>(undefined);

    return {
        subscribe,
        initialize: (wokaName: string, userId: number, visitCardUrl: string | undefined) => {
            set({
                wokaName,
                actions: new Array<WokaMenuAction>(),
                visitCardUrl,
                userId,
            });
        },
        addAction: (action: WokaMenuAction) => {
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

export const wokaMenuStore = createWokaMenuStore();

import type { ComponentType } from "svelte";
import { writable } from "svelte/store";
import { v4 } from "uuid";

export type WokaMenuAction = {
    uuid?: string;
    actionName: string;
    callback: () => void;
    protected?: boolean;
    priority?: number;
    style?: "is-success" | "is-error" | "is-primary" | string;
    actionIcon?: string | ComponentType;
};
export interface WokaMenuData {
    wokaName: string;
    actions: WokaMenuAction[];
    visitCardUrl?: string;
    userId: number;
    userUuid: string;
}

function createWokaMenuStore() {
    const { subscribe, update, set } = writable<WokaMenuData | undefined>(undefined);

    return {
        subscribe,
        initialize: (wokaName: string, userId: number, userUuid: string, visitCardUrl: string | undefined) => {
            set({
                wokaName,
                actions: new Array<WokaMenuAction>(),
                visitCardUrl,
                userId,
                userUuid,
            });
        },
        addAction: (action: WokaMenuAction) => {
            update((data) => {
                if (data === undefined) return data;

                const dataWithUuid = { ...action, uuid: action.uuid ?? v4() };
                data.actions = [...data.actions, dataWithUuid];
                return data;
            });
        },
        removeAction: (actionName: string) => {
            update((data) => {
                if (!data) return data;
                const index = data.actions.findIndex((action) => {
                    return action.actionName === actionName;
                });
                if (index == undefined || index === -1) return data;

                data.actions = [...data.actions.splice(index, 1)];
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

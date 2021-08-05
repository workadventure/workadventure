import { writable } from "svelte/store";
import type { UserInputManager } from "../Phaser/UserInput/UserInputManager";

export interface LayoutManagerAction {
    type: string;
    message: string | number | boolean | undefined;
    callback: () => void;
    userInputManager: UserInputManager | undefined;
}

export const layoutManagerVisibilityStore = writable(false);

function createLayoutManagerAction() {
    const { subscribe, set, update } = writable<LayoutManagerAction[]>([]);

    return {
        subscribe,
        addAction: (newAction: LayoutManagerAction): void => {
            update((list: LayoutManagerAction[]) => {
                let found = false;
                for (const actions of list) {
                    if (actions.type === newAction.type && actions.message === newAction.message) {
                        found = true;
                    }
                }

                if (!found) {
                    list.push(newAction);
                }

                return list;
            });
        },
        removeAction: (oldAction: LayoutManagerAction): void => {
            update((list: LayoutManagerAction[]) => {
                const index = list.findIndex(
                    (actions) => actions.type === oldAction.type && actions.message === oldAction.message
                );

                if (index !== -1) {
                    list.splice(index, 1);
                }

                return list;
            });
        },
        clearActions: (): void => {
            set([]);
        },
    };
}

export const layoutManagerActionStore = createLayoutManagerAction();

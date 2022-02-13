import { derived, writable } from "svelte/store";
import type { ActivatablesManager } from "../Phaser/Game/ActivatablesManager";
import type { UserInputManager } from "../Phaser/UserInput/UserInputManager";

export interface LayoutManagerAction {
    uuid: string;
    type: "warning" | "message";
    message: string | number | boolean | undefined;
    callback: () => void;
    userInputManager: UserInputManager | undefined;
}

function createLayoutManagerAction() {
    const { subscribe, set, update } = writable<LayoutManagerAction[]>([]);

    return {
        subscribe,
        addAction: (newAction: LayoutManagerAction): void => {
            update((list: LayoutManagerAction[]) => {
                let found = false;
                for (const action of list) {
                    if (action.uuid === newAction.uuid) {
                        found = true;
                    }
                }

                if (!found) {
                    list.push(newAction);
                    newAction.userInputManager?.addSpaceEventListner(newAction.callback);
                }

                return list;
            });
        },
        removeAction: (uuid: string): void => {
            update((list: LayoutManagerAction[]) => {
                const index = list.findIndex((action) => action.uuid === uuid);

                if (index !== -1) {
                    list[index].userInputManager?.removeSpaceEventListner(list[index].callback);
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

export const layoutManagerActionVisibilityStore = derived(layoutManagerActionStore, ($layoutManagerActionStore) => {
    return !!$layoutManagerActionStore.length;
});

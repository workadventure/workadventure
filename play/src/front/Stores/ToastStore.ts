import { v4 } from "uuid";
import { MapStore } from "@workadventure/store-utils";
import type { WorkAdventureComponent, WorkAdventureComponentProps } from "../../types/component";

interface Toast {
    component: WorkAdventureComponent;
    props: WorkAdventureComponentProps;
}

function createToastStore() {
    const innerStore = new MapStore<string, Toast>();

    return {
        subscribe: innerStore.subscribe.bind(innerStore),
        addToast: (
            toast: WorkAdventureComponent,
            props: WorkAdventureComponentProps,
            uuid: string | undefined,
        ): void => {
            const toastUuid = uuid ?? v4();
            innerStore.set(toastUuid, {
                component: toast,
                props: {
                    ...props,
                    toastUuid,
                },
            });
        },
        removeToast: (uuid: string): void => {
            innerStore.delete(uuid);
        },
    };
}

export const toastStore = createToastStore();

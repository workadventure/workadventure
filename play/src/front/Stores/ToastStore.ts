import type { ComponentType, SvelteComponent } from "svelte";
import { v4 } from "uuid";
import { MapStore } from "@workadventure/store-utils";

type Props = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SvelteComponentType = ComponentType<SvelteComponent<any, any, any>>;

interface Toast {
    //uuid: string;
    component: SvelteComponentType;
    props: Props;
}

function createToastStore() {
    const innerStore = new MapStore<string, Toast>();

    return {
        subscribe: innerStore.subscribe.bind(innerStore),
        addToast: (toast: SvelteComponentType, props: Props, uuid: string | undefined): void => {
            const toastUuid = uuid ?? v4();
            innerStore.set(toastUuid, {
                component: toast,
                props: {
                    props,
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

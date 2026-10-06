import { v4 } from "uuid";
import { ConcatenateMapStore, MapStore } from "@workadventure/store-utils";
import { derived } from "svelte/store";
import type { Readable, Unsubscriber } from "svelte/store";
import type { WorkAdventureComponent, WorkAdventureComponentProps } from "../../types/component";

export interface Toast {
    component: WorkAdventureComponent;
    props: WorkAdventureComponentProps;
}

export interface ToastInput {
    component: WorkAdventureComponent;
    props?: WorkAdventureComponentProps;
}

export interface ToastSourceOptions {
    onRemove?: () => void;
}

export interface ToastSourceDefinition {
    source: Readable<ToastInput | undefined>;
    options?: ToastSourceOptions;
    uuid?: string;
}

export function createToastStore(initialSources: ToastSourceDefinition[] = []) {
    const innerStore = new MapStore<string, Toast>();
    const combinedStore = new ConcatenateMapStore<string, Toast>();
    const sourceOptions = new Map<string, ToastSourceOptions>();

    combinedStore.addStore(innerStore);

    const store = {
        subscribe: combinedStore.subscribe.bind(combinedStore),
        addToast: (toast: WorkAdventureComponent, props: WorkAdventureComponentProps, uuid?: string): void => {
            const toastUuid = uuid ?? v4();
            innerStore.set(toastUuid, {
                component: toast,
                props: {
                    ...props,
                    toastUuid,
                },
            });
        },
        registerToastSource: (
            source: Readable<ToastInput | undefined>,
            options?: ToastSourceOptions,
            uuid?: string,
        ): Unsubscriber => {
            const toastUuid = uuid ?? v4();
            const sourceStore = derived(source, (toastInput) => {
                const toasts = new Map<string, Toast>();
                if (toastInput !== undefined) {
                    toasts.set(toastUuid, {
                        component: toastInput.component,
                        props: {
                            ...toastInput.props,
                            toastUuid,
                        },
                    });
                }
                return toasts;
            });

            if (options !== undefined) {
                sourceOptions.set(toastUuid, options);
            }
            combinedStore.addStore(sourceStore);

            return () => {
                combinedStore.removeStore(sourceStore);
                sourceOptions.delete(toastUuid);
            };
        },
        removeToast: (uuid: string): void => {
            innerStore.delete(uuid);
            sourceOptions.get(uuid)?.onRemove?.();
        },
    };

    for (const { source, options, uuid } of initialSources) {
        store.registerToastSource(source, options, uuid);
    }

    return store;
}

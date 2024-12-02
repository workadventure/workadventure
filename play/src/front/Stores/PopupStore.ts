import { derived, writable } from "svelte/store";
import { SvelteComponent } from "svelte";
import { v4 } from "uuid";

export const bannerVisible = writable(true);
export const currentBannerIndex = writable(0);
export const showPopup = writable(false);
interface Popup {
    uuid: string;
    component: typeof SvelteComponent;
    props: Props;
    callback?: () => void;
}

type Props = Record<string, unknown>;

type SvelteComponentType = typeof SvelteComponent;

function createPopupStore() {
    const { subscribe, update } = writable<Popup[]>([]);

    return {
        subscribe,
        addPopup: (popup: SvelteComponentType, props: Props, uuid: string | undefined): void => {
            update((list: Popup[]) => {
                if (uuid === undefined) {
                    uuid = v4();
                }
                // Look for an existing popup with the same uuid, and if existing, replace it
                const index = list.findIndex((item) => item.uuid === uuid);
                if (index !== -1) {
                    list[index] = {
                        uuid,
                        component: popup,
                        props,
                    };
                } else {
                    list.push({
                        uuid,
                        component: popup,
                        props,
                    });
                }
                return list;
            });
        },
        removePopup: (uuid: string): void => {
            update((list: Popup[]) => {
                const index = list.findIndex((item) => item.uuid === uuid);

                if (index !== -1) {
                    list.splice(index, 1);
                }

                return list;
            });
        },
        clearActions: (): void => {
            update(() => {
                return [];
            });
        },
    };
}

export const popupStore = createPopupStore();

export const popupVisibilityStore = derived(popupStore, ($popupStore) => {
    return !!$popupStore.length;
});

import { Modals, modals as svelteModals, onBeforeClose } from "svelte-modals";

type ModalOpenOptions = Parameters<typeof svelteModals.open>[2];
type SvelteModalComponent = Parameters<typeof svelteModals.open>[0];

export const modals = {
    get stack() {
        return svelteModals.stack;
    },
    get action() {
        return svelteModals.action;
    },
    get transitioning() {
        return svelteModals.transitioning;
    },
    open: (component: unknown, props?: Record<string, unknown>, options?: ModalOpenOptions) => {
        svelteModals.open(component as SvelteModalComponent, props, options).catch((error) => console.error(error));
    },
    close(amount?: number) {
        return svelteModals.close(amount);
    },
    closeById(id: string) {
        return svelteModals.closeById(id);
    },
    closeAll() {
        return svelteModals.closeAll();
    },
};

export { Modals, onBeforeClose };

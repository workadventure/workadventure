import { writable } from "svelte/store";

export function createSilentStore() {
    const { subscribe, set } = writable<boolean>(false);

    let area = false;
    let others = false;

    const updateSilent = () => {
        set(area || others);
    };

    return {
        subscribe,

        setAreaSilent(silent: boolean) {
            area = silent;
            updateSilent();
        },

        setOthersSilent(silent: boolean) {
            others = silent;
            updateSilent();
        },
    };
}

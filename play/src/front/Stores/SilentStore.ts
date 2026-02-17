import { writable } from "svelte/store";

export function createSilentStore() {
    const { subscribe, set } = writable<boolean>(false);

    let area = false;
    let others = false;
    let onboardingOverride = false;

    const updateSilent = () => {
        // During onboarding demo, temporarily disable silent zone so video/audio demo works
        if (onboardingOverride) {
            set(false);
        } else {
            set(area || others);
        }
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

        /** When true, forces silent to false (used during onboarding demo) */
        setOnboardingOverride(override: boolean) {
            onboardingOverride = override;
            updateSilent();
        },
    };
}

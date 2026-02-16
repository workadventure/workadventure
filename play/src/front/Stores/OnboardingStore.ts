import { writable, get, derived } from "svelte/store";

/** Set of currently pressed movement key codes (KeyW, KeyA, etc.) during the movement step */
export const pressedKeysStore = writable<Set<string>>(new Set());

/** True when any movement key is currently pressed - derived from pressedKeysStore */
export const movementKeysPressedStore = derived(pressedKeysStore, ($keys) => $keys.size > 0);

export type OnboardingStep =
    | "welcome"
    | "movement"
    | "communication"
    | "lockBubble"
    | "screenSharing"
    | "pictureInPicture"
    | "complete"
    | null;

function createOnboardingStore() {
    const STORAGE_KEY = "workadventure-onboarding-completed";
    const { subscribe, set } = writable<OnboardingStep | null>(null);

    const isCompleted = (): boolean => {
        if (typeof localStorage === "undefined") return false;
        return localStorage.getItem(STORAGE_KEY) === "true";
    };

    const start = () => {
        if (isCompleted()) {
            set(null);
            return;
        }
        set("welcome");
    };

    const next = () => {
        const current = get({ subscribe });
        if (current === null) return;

        const steps: OnboardingStep[] = [
            "welcome",
            "movement",
            "communication",
            "lockBubble",
            "screenSharing",
            "pictureInPicture",
            "complete",
        ];
        const currentIndex = steps.indexOf(current);
        if (currentIndex < steps.length - 1) {
            set(steps[currentIndex + 1]);
        } else {
            complete();
        }
    };

    const skip = () => {
        complete();
    };

    const complete = () => {
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(STORAGE_KEY, "true");
        }
        set(null);
    };

    const reset = () => {
        if (typeof localStorage !== "undefined") {
            localStorage.removeItem(STORAGE_KEY);
        }
        set(null);
    };

    const restart = () => {
        reset();
        // Start onboarding after a small delay to ensure UI is ready
        setTimeout(() => {
            set("welcome");
        }, 100);
    };

    return {
        subscribe,
        start,
        next,
        skip,
        complete,
        reset,
        restart,
        isCompleted,
    };
}

export const onboardingStore = createOnboardingStore();

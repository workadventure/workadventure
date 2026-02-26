import { writable, get, derived } from "svelte/store";
import { gameManager } from "../Phaser/Game/GameManager";
import { ENABLE_TUTORIAL } from "../Enum/EnvironmentVariable";
import { inBbbStore, inJitsiStore, inLivekitStore } from "./MediaStore";

const TUTORIAL_DONE_KEY = "tutorialDone";

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
    const { subscribe, set } = writable<OnboardingStep | null>(null);

    const isCompleted = (): boolean => {
        // If the user is already in a conversation bubble, we consider the onboarding as completed
        if (get(inJitsiStore) || get(inLivekitStore) || get(inBbbStore) || get(inLivekitStore)) {
            return true;
        }

        // If the room has enableTutorial set to false, we consider the onboarding as completed
        const scene = gameManager.getCurrentGameScene();
        const { enableTutorial } = (scene?.room?.metadata as { enableTutorial?: boolean }) ?? {
            enableTutorial: ENABLE_TUTORIAL ?? true,
        };
        console.log("enableTutorial", enableTutorial);
        if (!enableTutorial) return true;

        // Check player state "tutorialDone" (same as WA.player.state.tutorialDone in scripting API)
        const manager = scene?.getPlayerVariablesManager?.();
        if (!manager) return false;
        const value = manager.variables.get(TUTORIAL_DONE_KEY);
        return value === true || value === "true";
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
        const scene = gameManager.getCurrentGameScene();
        const manager = scene?.getPlayerVariablesManager?.();
        if (manager) {
            manager.setVariableFromApp(TUTORIAL_DONE_KEY, true, { persist: true, scope: "world" });
        }
        set(null);
    };

    const reset = () => {
        const scene = gameManager.getCurrentGameScene();
        const manager = scene?.getPlayerVariablesManager?.();
        if (manager) {
            manager.setVariableFromApp(TUTORIAL_DONE_KEY, false, { persist: true, scope: "world" });
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

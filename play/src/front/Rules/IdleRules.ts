import { get } from "svelte/store";
import { idleStore } from "../Stores/IdleStore";
import { focusStore } from "../Stores/FocusStore";
import { privacyShutdownStore } from "../Stores/PrivacyShutdownStore";
import { requestedStatusStore } from "../Stores/MediaStore";
import { isInActiveConversationStore } from "../Stores/StreamableCollectionStore";
import { gameSceneIsLoadedStore } from "../Stores/GameSceneStore";

export const AWAY_BEFORE_IDLE_MS = 3 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 60_000;

/**
 * Idle starts only over Online or Away, never over a status the user picked, and never with someone: a user
 * following a meeting without touching anything is not idle.
 */
export function goIdle(): void {
    if (get(requestedStatusStore) !== null || get(isInActiveConversationStore)) {
        return;
    }
    idleStore.set(true);
}

/**
 * What ends idle: coming back to WorkAdventure (the focus; turning a device on from the mini window ends it too, see
 * privacyShutdownStore.comeBack). Activity in another app does not: the user has not seen WorkAdventure yet.
 *
 * What starts it everywhere:
 * - a page that never had the focus when its first map is loaded: nobody has looked at it. The desktop app started
 *   with the computer, a pinned tab the browser restored, a tab opened in the background. The first map only: a
 *   later one (a door, a teleport) is not a new page.
 * - 3 hours in away mode. Measured with Date.now() and checked every minute, not one 3-hour timer: a page timer may
 *   not count the time the computer slept, and a tab left open overnight is what this rule is for.
 *
 * The desktop app adds its idle monitor (Api/Desktop).
 */
export function startIdleRules(): () => void {
    let everFocused = false;
    let awaySince: number | undefined;
    const unsubscribeFocus = focusStore.subscribe((focused) => {
        if (focused) {
            everFocused = true;
            idleStore.set(false);
        }
    });
    let firstMapLoaded = false;
    const unsubscribeMapLoad = gameSceneIsLoadedStore.subscribe((loaded) => {
        if (!loaded || firstMapLoaded) {
            return;
        }
        firstMapLoaded = true;
        if (!everFocused) {
            goIdle();
        }
    });
    const unsubscribeAway = privacyShutdownStore.subscribe((away) => {
        awaySince = away ? (awaySince ?? Date.now()) : undefined;
    });
    const timer = setInterval(() => {
        if (awaySince !== undefined && Date.now() - awaySince >= AWAY_BEFORE_IDLE_MS) {
            goIdle();
        }
    }, CHECK_EVERY_MS);
    return () => {
        clearInterval(timer);
        unsubscribeFocus();
        unsubscribeMapLoad();
        unsubscribeAway();
    };
}

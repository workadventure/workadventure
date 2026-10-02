import { get } from "svelte/store";
import type { Game } from "phaser";
import { gameSceneIsLoadedStore } from "../../Stores/GameSceneStore";

const TICK_INTERVAL = 16;
const FRAME_STALE_AFTER = 100;
const GIVE_UP_AFTER = 60_000;

/**
 * Everything left of the boot — switching to GameScene, reaching connect(), joining the room — is
 * dispatched by a loop that runs on requestAnimationFrame, which a hidden renderer never gets.
 * Until the world is reached, clock that loop by hand whenever frames stop arriving, so a window
 * that starts in the background joins its room instead of freezing on the loading screen. Same code
 * path as always, only the clock changes. While the interval drives, Phaser's own clock is put to
 * sleep and woken as soon as a frame arrives, so the loop only ever has one driver.
 *
 * Returns a function that stops the pump; it is safe to call more than once.
 */
export function startBackgroundBootPump(game: Game): () => void {
    const loop = game.loop;
    const startedAt = performance.now();
    let lastFrameAt = startedAt;
    let driving = false;
    let pump: ReturnType<typeof setInterval> | undefined;

    const handBack = () => {
        if (driving) {
            driving = false;
            loop.wake();
        }
    };

    const stop = () => {
        if (pump === undefined) {
            return;
        }
        clearInterval(pump);
        pump = undefined;
        // Leave Phaser holding its own clock, or a window revealed later would never redraw.
        handBack();
    };

    // A frame only means the window is visible *right now*: a world can still be sent to the
    // background while it loads, so the interval stays armed until the world is reached.
    const watchFrames = () => {
        lastFrameAt = performance.now();
        handBack();
        if (pump !== undefined) {
            requestAnimationFrame(watchFrames);
        }
    };
    requestAnimationFrame(watchFrames);

    pump = setInterval(() => {
        const now = performance.now();
        // Give up on a user parked on a name or woka screen that no tick can get past.
        if (get(gameSceneIsLoadedStore) || now - startedAt > GIVE_UP_AFTER) {
            stop();
            return;
        }
        if (now - lastFrameAt > FRAME_STALE_AFTER) {
            if (!driving) {
                driving = true;
                loop.sleep();
            }
            loop.tick();
        }
    }, TICK_INTERVAL);

    return stop;
}

import Debug from "debug";
import * as Sentry from "@sentry/svelte";
import { get } from "svelte/store";
import { bubbleSoundStore } from "../Stores/AudioManagerStore";

const debug = Debug("AudioOutput");

/**
 * Volume used for the "test your audio output" sound. Louder than the in-game bubble sound
 * (played at 0.2) because the point of the test is to be unambiguously audible.
 */
const TEST_SOUND_VOLUME = 0.5;

/**
 * URL of the sound played when entering a bubble. The file must exist under `public/`:
 * only the `-ding` and `-wobble` variants do.
 */
export function getBubbleSoundUrl(bubbleSound: string): string {
    return `/resources/objects/webrtc-in-${bubbleSound}.mp3`;
}

/**
 * Routes a media element to a given audio output device.
 *
 * `deviceId` is an empty string for "system default", which is a meaningful value: it resets an
 * element that was previously pinned to a specific sink. Only `undefined` means "nothing to do".
 *
 * Returns whether the sink is now the requested one. `false` covers the browsers that do not
 * implement the Audio Output Devices API at all (Firefox before 116, Safari), where callers are
 * expected to carry on with the system default rather than fail.
 */
export async function applySinkId(el: HTMLMediaElement, deviceId: string | undefined): Promise<boolean> {
    if (deviceId === undefined) {
        return false;
    }
    if (typeof el.setSinkId !== "function") {
        debug("setSinkId is not supported by this browser, keeping the system default output");
        return false;
    }
    if (el.sinkId === deviceId) {
        return true;
    }

    try {
        await el.setSinkId(deviceId);
        debug("Audio output set to %s", deviceId);
        return true;
    } catch (e) {
        Sentry.captureException(e);
        if (e instanceof DOMException && e.name === "AbortError") {
            // The device went away between enumeration and use. Fall back to the system default so
            // the caller still produces sound.
            console.warn("Error setting the audio output device. We fallback to default.", e);
            try {
                await el.setSinkId("");
            } catch (fallbackError) {
                console.error("Error resetting the audio output device: ", fallbackError);
            }
            return false;
        }
        console.error("Error setting the audio output device: ", e);
        return false;
    }
}

/**
 * Single element reused across every test, so that repeated clicks restart the sound instead of
 * stacking up `<audio>` elements (and overlapping sounds).
 */
let testAudioElement: HTMLAudioElement | undefined;
let testAudioElementUrl: string | undefined;
/** Serializes overlapping clicks: setSinkId and play() must not interleave across two runs. */
let testSoundQueue: Promise<void> = Promise.resolve();

/**
 * Plays a short sound on `deviceId` so the user can check which device they actually selected.
 *
 * The sink is applied *before* `play()`: Chrome ignores a sink set on an already-playing element.
 */
export function playTestSound(deviceId: string | undefined): Promise<void> {
    testSoundQueue = testSoundQueue.then(() => runTestSound(deviceId)).catch(() => {});
    return testSoundQueue;
}

async function runTestSound(deviceId: string | undefined): Promise<void> {
    if (!testAudioElement) {
        testAudioElement = new Audio();
        testAudioElement.preload = "auto";
    }
    const el = testAudioElement;

    const url = getBubbleSoundUrl(get(bubbleSoundStore));
    if (testAudioElementUrl !== url) {
        testAudioElementUrl = url;
        el.src = url;
    }
    el.volume = TEST_SOUND_VOLUME;

    await applySinkId(el, deviceId);

    el.pause();
    el.currentTime = 0;
    try {
        await el.play();
    } catch (e) {
        // Autoplay policies should not bite here (the sound follows a click), so a failure is worth
        // reporting rather than swallowing.
        console.error("Could not play the audio output test sound: ", e);
        Sentry.captureException(e);
    }
}

import Debug from "debug";
import * as Sentry from "@sentry/svelte";
import { get } from "svelte/store";
import type { Unsubscriber } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";
// Imported from the leaf store module, not MediaStore: this module is reached from
// AudioContextManager, which MediaStore pulls in through SoundMeter.
import { speakerSelectedStore, usedSpeakerDeviceIdStore } from "../Stores/AudioOutputStore";

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
 * What became of a routing attempt.
 *
 * Callers must tell these apart: `fell-back-to-default` means the device is gone and the selection
 * is worth revisiting, while `unsupported` merely means this browser has no Audio Output Devices
 * API — dropping the user's preference there would be wrong.
 */
export type SinkOutcome = "applied" | "unsupported" | "fell-back-to-default" | "failed";

/**
 * Serializes routing per target. `setSinkId` is asynchronous, so two calls racing on the same
 * element can settle in reverse order and leave it on the wrong device.
 */
const sinkQueues = new WeakMap<object, Promise<unknown>>();

function enqueue<T>(target: object, task: () => Promise<T>): Promise<T> {
    const previous = sinkQueues.get(target) ?? Promise.resolve();
    // Run `task` whether the previous one resolved or rejected: a failure must not wedge the queue.
    const result = previous.then(task, task);
    sinkQueues.set(
        target,
        result.catch(() => undefined),
    );
    return result;
}

/**
 * Routes a media element to a given audio output device.
 *
 * `deviceId` is an empty string for "system default", which is a meaningful value: it resets an
 * element that was previously pinned to a specific sink. Only `undefined` means "nothing to do".
 */
export function applySinkId(el: HTMLMediaElement, deviceId: string | undefined): Promise<SinkOutcome> {
    if (deviceId === undefined) {
        return Promise.resolve("failed");
    }
    if (typeof el.setSinkId !== "function") {
        debug("setSinkId is not supported by this browser, keeping the system default output");
        return Promise.resolve("unsupported");
    }
    // Bound up front: the narrowing above does not survive into the async closure below.
    const setSinkId = el.setSinkId.bind(el);

    return enqueue(el, async (): Promise<SinkOutcome> => {
        if (el.sinkId === deviceId) {
            usedSpeakerDeviceIdStore.set(deviceId);
            return "applied";
        }

        try {
            await setSinkId(deviceId);
            debug("Audio output set to %s", deviceId);
            usedSpeakerDeviceIdStore.set(deviceId);
            return "applied";
        } catch (e) {
            Sentry.captureException(e);
            if (e instanceof DOMException && e.name === "AbortError") {
                // The device went away between enumeration and use. Fall back to the system default
                // so the caller still produces sound.
                console.warn("Error setting the audio output device. We fallback to default.", e);
                try {
                    await setSinkId("");
                    usedSpeakerDeviceIdStore.set("");
                } catch (fallbackError) {
                    console.error("Error resetting the audio output device: ", fallbackError);
                }
                return "fell-back-to-default";
            }
            console.error("Error setting the audio output device: ", e);
            return "failed";
        }
    });
}

/**
 * Keeps a media element on the selected audio output, now and whenever the selection changes.
 * Returns an unsubscriber the caller must invoke on teardown.
 */
export function bindAudioOutput(el: HTMLMediaElement): Unsubscriber {
    return speakerSelectedStore.subscribe((deviceId) => {
        applySinkId(el, deviceId).catch((e: unknown) => {
            console.error("Error routing a media element to the selected audio output: ", e);
            Sentry.captureException(e);
        });
    });
}

/**
 * Svelte action form of {@link bindAudioOutput}, for elements declared in a template:
 * `<audio use:audioOutput>`.
 */
export function audioOutput(node: HTMLMediaElement): { destroy: () => void } {
    const unsubscribe = bindAudioOutput(node);
    return { destroy: unsubscribe };
}

/**
 * Routes an AudioContext to the selected audio output (Chrome 110+), for sound that never goes
 * through a media element: the Phaser sound manager, the WebAudio playback fallback, and the
 * scripting API's PCM streams.
 *
 * Unlike {@link applySinkId} this does not feed `usedSpeakerDeviceIdStore`: browsers can support
 * one API and not the other, and the settings UI reports on media elements.
 */
export function bindAudioContextOutput(context: AudioContext): Unsubscriber {
    if (typeof context.setSinkId !== "function") {
        debug("AudioContext.setSinkId is not supported by this browser, keeping the system default output");
        return () => {};
    }

    return speakerSelectedStore.subscribe((deviceId) => {
        if (deviceId === undefined) {
            return;
        }
        enqueue(context, async () => {
            try {
                // Reading back the current sink is not portable, so this always re-applies.
                await context.setSinkId?.(deviceId);
                debug("AudioContext output set to %s", deviceId);
            } catch (e) {
                // Not fatal: the context keeps playing on the previous (or default) device.
                console.warn("Could not set the AudioContext output device: ", e);
                Sentry.captureException(e);
            }
        }).catch((e: unknown) => Sentry.captureException(e));
    });
}

/**
 * Plays a one-shot sound (notification, announcement) on the selected audio output.
 *
 * The sink is applied *before* `play()`: Chrome ignores a sink set on an already-playing element.
 */
export async function playNotificationSound(url: string, volume = 1): Promise<void> {
    const el = new Audio(url);
    el.volume = volume;

    await applySinkId(el, get(speakerSelectedStore));

    try {
        await el.play();
    } catch (e) {
        // Usually an autoplay policy rejection when no user gesture happened yet. Worth reporting,
        // but never worth breaking the caller over.
        console.warn("Could not play sound: ", url, e);
    }
}

/**
 * Single element reused across every test, so that repeated clicks restart the sound instead of
 * stacking up `<audio>` elements (and overlapping sounds).
 */
let testAudioElement: HTMLAudioElement | undefined;
let testAudioElementUrl: string | undefined;
/** Serializes overlapping clicks: pause/rewind/play must not interleave across two runs. */
let testSoundQueue: Promise<void> = Promise.resolve();

/**
 * Plays a short sound on `deviceId` so the user can check which device they actually selected.
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

    // Read from local storage rather than bubbleSoundStore: that store lives in AudioManagerStore,
    // which is not a leaf, and both are always written together.
    const url = getBubbleSoundUrl(localUserStore.getBubbleSound());
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

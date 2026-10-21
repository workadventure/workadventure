import Debug from "debug";
import type { Action } from "svelte/action";
import { get } from "svelte/store";
import type { Unsubscriber } from "svelte/store";
import { speakerSelectedStore } from "../Stores/AudioOutputStore";
import { localUserStore } from "../Connection/LocalUserStore";

const debug = Debug("AudioOutput");

/**
 * setSinkId() can take seconds (a Bluetooth headset switching profile) or never settle. Past this delay, what waits for
 * it stops waiting: the next request for the same element, a sound about to play, a stream about to be attached.
 */
export const SINK_ID_TIMEOUT_MS = 2_000;

/** What setSinkId() routes: a media element, or an AudioContext (Chrome 110+), for sound that never goes through one. */
type AudioSink = HTMLMediaElement | AudioContext;

/** How a request ended. "fell-back": the device could not be switched to, the element plays on the system default. */
export type SinkOutcome = "applied" | "fell-back" | "failed";

interface SinkRequest {
    deviceId: string;
    outcome: Promise<SinkOutcome>;
    settled: boolean;
    /** When the next request may start: once this one settled, or SINK_ID_TIMEOUT_MS after it started. */
    turn: Promise<void>;
}

/**
 * Per element: its last request. setSinkId() is asynchronous, so two calls racing on the same element could settle in
 * reverse order and leave it on the wrong device: requests run one after the other.
 */
const sinks = new WeakMap<AudioSink, SinkRequest>();

const delay = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

/**
 * Routes a media element or an AudioContext to an audio output ("" is the system default). Requests on the same element
 * run in order, and a request for the device already being requested joins it. Resolves once the request settled,
 * which can take seconds or never happen (see SINK_ID_TIMEOUT_MS). Never rejects.
 */
export function applySinkId(el: AudioSink, deviceId: string): Promise<SinkOutcome> {
    const previous = sinks.get(el);
    if (previous?.deviceId === deviceId && !previous.settled) {
        return previous.outcome;
    }
    if (typeof el.setSinkId !== "function") {
        return Promise.resolve("failed");
    }
    const setSinkId = el.setSinkId.bind(el);

    const start = previous?.turn ?? Promise.resolve();
    const outcome: Promise<SinkOutcome> = start.then(() =>
        el.sinkId === deviceId ? "applied" : setSinkIdOrFallBack(el, setSinkId, deviceId),
    );
    const request: SinkRequest = {
        deviceId,
        outcome,
        settled: false,
        turn: start.then(() => Promise.race([outcome.then(() => undefined), delay(SINK_ID_TIMEOUT_MS)])),
    };
    sinks.set(el, request);

    outcome
        .then(() => {
            request.settled = true;
            // A newer request that went ahead (this one took too long) settled first: this one left the element on
            // its older device.
            const latest = sinks.get(el);
            if (latest !== undefined && latest !== request && latest.settled) {
                debug("setSinkId(%s) settled late, applying %s again", deviceId, latest.deviceId);
                return applySinkId(el, latest.deviceId);
            }
            return undefined;
        })
        .catch((e: unknown) => console.warn("Could not re-apply the audio output device", e));
    return outcome;
}

/** While requests for el are pending: a promise that resolves once they settled (never rejects). Otherwise undefined. */
export function pendingSinkRequests(el: AudioSink): Promise<void> | undefined {
    const request = sinks.get(el);
    return request && !request.settled ? request.outcome.then(() => undefined) : undefined;
}

async function setSinkIdOrFallBack(
    el: AudioSink,
    setSinkId: (sinkId: string) => Promise<void>,
    deviceId: string,
): Promise<SinkOutcome> {
    try {
        await setSinkId(deviceId);
        debug("Audio output set to %s", deviceId);
        return "applied";
    } catch (e) {
        // Not reported to Sentry: the element keeps playing on its current output, and an embedding page without the
        // speaker-selection permission would make every element fail on every selection change.
        // AbortError: the device could not be switched to (unplugged since the enumeration). Fall back to the system
        // default so that the element still plays, unless a newer request took over: that would override it.
        if (e instanceof DOMException && e.name === "AbortError" && sinks.get(el)?.deviceId === deviceId) {
            console.warn("Could not set the audio output device, falling back to the default one", e);
            try {
                await setSinkId("");
            } catch (fallbackError) {
                console.warn("Could not reset the audio output device", fallbackError);
            }
            return "fell-back";
        }
        console.warn("Could not set the audio output device", e);
        return "failed";
    }
}

/**
 * Keeps a media element or an AudioContext on the audio output selected in the settings, until the returned function
 * is called.
 */
export function bindAudioOutput(el: AudioSink): Unsubscriber {
    return speakerSelectedStore.subscribe((deviceId) => {
        // undefined: nothing selected, or a browser where we never choose the output (see speakerSelectionSupported)
        if (deviceId !== undefined) {
            applySinkId(el, deviceId).catch((e: unknown) => console.warn("Could not set the audio output device", e));
        }
    });
}

/**
 * {@link bindAudioOutput} for an element of a template: `<audio use:audioOutput>`.
 *
 * Only for elements playing a `src`: a MediaStream in `srcObject` must not be attached before setSinkId() resolved
 * (crbug 971947), which AudioStream.svelte handles itself.
 */
export const audioOutput: Action<HTMLMediaElement> = (el) => ({ destroy: bindAudioOutput(el) });

/**
 * Plays an element not rendered by a template (a one-off sound) on the audio output selected in the settings. The sink
 * is applied before play(), waiting at most SINK_ID_TIMEOUT_MS for it. Rejects like play() does.
 */
export async function playOnSelectedOutput(el: HTMLMediaElement): Promise<void> {
    const deviceId = get(speakerSelectedStore);
    // undefined: play() stays synchronous, within the user gesture that triggered it (WebKit requires one)
    if (deviceId !== undefined) {
        await Promise.race([applySinkId(el, deviceId), delay(SINK_ID_TIMEOUT_MS)]);
    }
    await el.play();
}

let speakerTestSound: HTMLAudioElement | undefined;

/**
 * Plays the bubble sound on the selected audio output, for the user to check it. One element per sound, so that a
 * click while it plays does not stack another one.
 */
export function playSpeakerTestSound(): Promise<void> {
    // Not the exact URL the GameScene preloads: Firefox hands this element's cached response to Phaser's XHR, which
    // rejects it, and the game stops on "Cannot load .../webrtc-in-ding.mp3" (NETWORK_ERROR).
    const url = `/resources/objects/webrtc-in-${localUserStore.getBubbleSound()}.mp3?speaker-test`;
    if (speakerTestSound?.getAttribute("src") !== url) {
        speakerTestSound = new Audio(url);
    }
    return playOnSelectedOutput(speakerTestSound);
}

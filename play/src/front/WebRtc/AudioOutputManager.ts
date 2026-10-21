import Debug from "debug";
import type { Action } from "svelte/action";
import { get } from "svelte/store";
import type { Unsubscriber } from "svelte/store";
import { speakerSelectedStore } from "../Stores/AudioOutputStore";

const debug = Debug("AudioOutput");

/**
 * setSinkId() can take seconds (a Bluetooth headset switching profile) or never settle. Past this delay, the next
 * request for the same element stops waiting for it.
 */
const SINK_ID_TIMEOUT_MS = 2_000;

/** What setSinkId() routes: a media element, or an AudioContext (Chrome 110+), for sound that never goes through one. */
type AudioSink = HTMLMediaElement | AudioContext;

/**
 * Per element: the device last requested, and the tail of its request queue. setSinkId() is asynchronous, so two calls
 * racing on the same element could settle in reverse order and leave it on the wrong device.
 */
const sinks = new WeakMap<AudioSink, { deviceId: string; queue: Promise<void> }>();

/**
 * Routes a media element or an AudioContext to an audio output ("" is the system default). Requests on the same element are applied in
 * order. The promise settles once this request is applied, failed or timed out, and never rejects.
 */
export function applySinkId(el: AudioSink, deviceId: string): Promise<void> {
    if (typeof el.setSinkId !== "function") {
        return Promise.resolve();
    }
    const setSinkId = el.setSinkId.bind(el);
    const queue = (sinks.get(el)?.queue ?? Promise.resolve()).then(() => applyInTurn(el, setSinkId, deviceId));
    sinks.set(el, { deviceId, queue });
    return queue;
}

async function applyInTurn(
    el: AudioSink,
    setSinkId: (sinkId: string) => Promise<void>,
    deviceId: string,
): Promise<void> {
    if (el.sinkId === deviceId) {
        return;
    }

    const request = setSinkIdOrFallBack(el, setSinkId, deviceId);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const settled = await Promise.race([
        request.then(() => true),
        new Promise<boolean>((resolve) => {
            timeout = setTimeout(() => resolve(false), SINK_ID_TIMEOUT_MS);
        }),
    ]);
    clearTimeout(timeout);

    if (!settled) {
        debug("setSinkId(%s) is taking too long, moving on to the next request", deviceId);
        // If it settles after a newer request went ahead, it leaves the element on this older device.
        request
            .then(() => {
                const latest = sinks.get(el)?.deviceId;
                if (latest !== undefined && latest !== deviceId) {
                    return applySinkId(el, latest);
                }
                return undefined;
            })
            .catch((e: unknown) => console.warn("Could not re-apply the audio output device", e));
    }
}

async function setSinkIdOrFallBack(
    el: AudioSink,
    setSinkId: (sinkId: string) => Promise<void>,
    deviceId: string,
): Promise<void> {
    try {
        await setSinkId(deviceId);
        debug("Audio output set to %s", deviceId);
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
            return;
        }
        console.warn("Could not set the audio output device", e);
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
        await applySinkId(el, deviceId);
    }
    await el.play();
}

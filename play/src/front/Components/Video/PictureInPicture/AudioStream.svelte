<script lang="ts">
    import { onDestroy } from "svelte";
    import Debug from "debug";
    import * as Sentry from "@sentry/svelte";
    import type { Readable } from "svelte/store";
    import { signalAudioPlaybackBlocked } from "../../../Stores/AudioPlaybackStore";
    import { userActivationManager } from "../../../Stores/UserActivationStore";
    import { audioContextManager } from "../../../WebRtc/AudioContextManager";

    interface Props {
        streamStore: Readable<MediaStream | undefined>;
        outputDeviceId?: string;
        isBlocked: Readable<boolean>;
        volume: Readable<number>;
        onselectoutputaudiodeviceerror?: () => void;
    }

    let {
        streamStore,
        outputDeviceId = undefined,
        isBlocked,
        volume,
        onselectoutputaudiodeviceerror,
    }: Props = $props();

    const debug = Debug("AudioStream");

    let audioElement: HTMLAudioElement | undefined = $state();

    $effect(() => {
        if (audioElement) {
            audioElement.volume = $volume;
        }
        if (webAudioGain) {
            webAudioGain.gain.value = $volume;
        }
    });

    // The sink request currently applied (or in flight) and the element/device it targets. De-duplication is
    // done on the *promise*, not on the requested device id: callers must be able to await the actual
    // completion of setSinkId(), which is what the srcObject attach below relies on. Keying on the element
    // too makes the sink re-apply when the <audio> tag is recreated (see the {#if !$isBlocked} block).
    let sinkPromise: Promise<boolean> | undefined;
    let sinkDeviceId: string | undefined;
    let sinkElement: HTMLAudioElement | undefined;

    function ensureSinkId(deviceId: string, el: HTMLAudioElement): Promise<boolean> {
        if (!sinkPromise || sinkDeviceId !== deviceId || sinkElement !== el) {
            sinkDeviceId = deviceId;
            sinkElement = el;
            sinkPromise = safeSetSinkId(deviceId, el);
        }
        return sinkPromise;
    }

    async function safeSetSinkId(deviceId: string, el: HTMLAudioElement) {
        if (destroyed) {
            return false;
        }
        if (typeof el.setSinkId !== "function") {
            return false;
        }
        try {
            debug("Setting output device to ", deviceId);
            await el.setSinkId(deviceId);
            debug("Output device set to ", deviceId);
            return true;
        } catch (e) {
            if (destroyed) {
                return false;
            }

            Sentry.captureException(e);
            if (e instanceof DOMException && e.name === "AbortError") {
                // An error occurred while setting the sinkId. Let's fall back to default.
                console.warn("Error setting the audio output device. We fallback to default.");

                try {
                    await el.setSinkId("");
                    // The element is back on the default output: forget the failed request so that the same
                    // device can be requested again later.
                    sinkDeviceId = "";
                } catch (e) {
                    console.error("Error resetting the audio output device: ", e);
                }

                onselectoutputaudiodeviceerror?.();
                return false;
            }
            console.error("Error setting the audio output device: ", e);
            return false;
        }
    }

    // Apply the selected output device as soon as the element exists, even before a stream is attached (the
    // attach below waits for this very request to resolve).
    $effect(() => {
        if (outputDeviceId && audioElement) {
            ensureSinkId(outputDeviceId, audioElement).catch((e) => {
                console.error("Error setting the audio output device: ", e);
                Sentry.captureException(e);
            });
        }
    });

    let destroyed = false;
    let webAudioStream: MediaStream | undefined;
    let webAudioSource: MediaStreamAudioSourceNode | undefined;
    let webAudioGain: GainNode | undefined;

    function stopWebAudioPlayback(): void {
        webAudioSource?.disconnect();
        webAudioGain?.disconnect();
        webAudioStream = undefined;
        webAudioSource = undefined;
        webAudioGain = undefined;
    }

    async function startWebAudioPlayback(stream: MediaStream): Promise<boolean> {
        if (destroyed) {
            return false;
        }

        const context = audioContextManager.getContext();
        if (context.state === "closed") {
            return false;
        }
        if (context.state === "suspended") {
            try {
                await context.resume();
            } catch (e) {
                debug("Could not resume AudioContext for WebAudio playback fallback", e);
                Sentry.captureException(e);
            }
        }
        if (destroyed || context.state !== "running") {
            return false;
        }
        if (webAudioStream === stream && webAudioSource && webAudioGain) {
            return true;
        }

        stopWebAudioPlayback();
        webAudioStream = stream;
        webAudioSource = context.createMediaStreamSource(stream);
        webAudioGain = context.createGain();
        webAudioGain.gain.value = $volume;
        webAudioSource.connect(webAudioGain);
        webAudioGain.connect(context.destination);
        debug("Audio playback routed through WebAudio fallback");
        return true;
    }

    function shouldFallbackToWebAudio(e: unknown): boolean {
        return e instanceof DOMException && e.name === "NotAllowedError";
    }

    // Some Chromium-based browsers (Brave, Vivaldi) do NOT honor the `autoplay` attribute for a MediaStream
    // assigned to `srcObject` (verified: the element stays paused regardless of assignment timing), so the
    // remote peer is inaudible. We therefore start playback explicitly with el.play(). That call only needs
    // *sticky* user activation (any prior interaction, e.g. moving the avatar), so in normal use no click is
    // needed. If there has been no interaction at all yet, play() is blocked; we then raise the app-level
    // BrowserNoSoundInfoToast (see signalAudioPlaybackBlocked) and retry this element once the page gains
    // activation. The retry is NOT registered in audioPlaybackStore here: that would tie the toast's lifetime
    // to this component, which BACK_IN_A_MOMENT destroys, making the toast flash and vanish.
    let activationRetryScheduled = false;

    function playAudio(): void {
        const el = audioElement;
        if (!el || destroyed || !el.srcObject) {
            return;
        }
        el.play()
            .then(() => {
                stopWebAudioPlayback();
            })
            .catch((e) => {
                // If the `autoplay` attribute already started playback, this rejection is harmless.
                if (destroyed || !el.paused) {
                    return;
                }

                const stream = el.srcObject;
                if (shouldFallbackToWebAudio(e) && stream instanceof MediaStream) {
                    startWebAudioPlayback(stream)
                        .then((started) => {
                            if (!started) {
                                signalBlockedAudioPlayback(e);
                            }
                        })
                        .catch((fallbackError: unknown) => {
                            console.error("Could not start WebAudio playback fallback", fallbackError);
                            Sentry.captureException(fallbackError);
                            signalBlockedAudioPlayback(e);
                        });
                    return;
                }

                signalBlockedAudioPlayback(e);
            });
    }

    function signalBlockedAudioPlayback(e: unknown): void {
        // Genuine block (missing user activation, e.g. Brave / Vivaldi: "play() can only be initiated
        // by a user gesture").
        debug("Audio playback blocked, waiting for a user gesture to retry", e);
        // Keep the toast + BACK_IN_A_MOMENT status alive at app level (survives this component being
        // destroyed when the bubble closes).
        signalAudioPlaybackBlocked();
        // Retry this specific element once the page gains user activation (covers the case where the
        // bubble is NOT closed, e.g. when browser notifications are enabled). At most once, to avoid a
        // tight loop if playback keeps failing for another reason after activation.
        if (!activationRetryScheduled) {
            activationRetryScheduled = true;
            userActivationManager
                .waitForUserActivation()
                .then(() => {
                    if (!destroyed) {
                        playAudio();
                    }
                })
                .catch((err: unknown) => Sentry.captureException(err));
        }
    }

    let stream = $derived($streamStore ? $streamStore : undefined);

    function attachStream(el: HTMLAudioElement, mediaStream: MediaStream): void {
        if (destroyed) {
            return;
        }
        if (el.srcObject !== mediaStream) {
            el.srcObject = mediaStream;
        }
        playAudio();
    }

    // Assign srcObject with $effect.pre (runs *before* the DOM update, matching the Svelte 4 `$:` block this
    // replaced) and then start playback via playAudio(). The explicit play() is what actually restores sound
    // in Brave/Vivaldi — those browsers ignore the `autoplay` attribute for a MediaStream even with correct
    // pre-DOM timing; .pre is kept only for parity with the pre-migration behavior.
    // Because of a bug in Chrome, the stream must not be attached before setSinkId() has resolved, otherwise
    // playback stays on the default output device. This is the only place attaching the stream, so that this
    // ordering cannot be bypassed. Deferring the attach by a microtask does not break the Brave/Vivaldi
    // play() above: it only needs *sticky* user activation, which is not consumed by the wait.
    $effect.pre(() => {
        const el = audioElement;
        const currentStream = stream;
        const deviceId = outputDeviceId;
        if (!el || !currentStream) {
            return;
        }

        if (!deviceId) {
            attachStream(el, currentStream);
            return;
        }

        ensureSinkId(deviceId, el)
            .then(() => {
                // Reads inside this callback are not tracked by the effect (it already ran synchronously);
                // they only guard against the element or the stream having changed while we waited.
                if (!destroyed && audioElement === el && stream === currentStream) {
                    attachStream(el, currentStream);
                }
            })
            .catch((e: unknown) => {
                console.error("Error setting the audio output device: ", e);
                Sentry.captureException(e);
            });
    });

    onDestroy(() => {
        destroyed = true;
        stopWebAudioPlayback();
    });
</script>

{#if !$isBlocked}
    <audio bind:this={audioElement} autoplay={true}></audio>
{/if}

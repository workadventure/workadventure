<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import Debug from "debug";
    import * as Sentry from "@sentry/svelte";
    import type { Readable } from "svelte/store";
    import {
        describeAudioTrack,
        getAudioContextDiagnostics,
        getAudioPlaybackDiagnostics,
        registerAudioPlaybackElement,
    } from "../../../WebRtc/AudioDiagnostics";

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
    });

    let lastRequestedDeviceId: string | undefined;

    async function safeSetSinkId(deviceId: string, el: HTMLAudioElement) {
        if (destroyed) {
            return false;
        }
        if (lastRequestedDeviceId === deviceId) {
            return true;
        }
        if (typeof el.setSinkId !== "function") {
            return false;
        }
        lastRequestedDeviceId = deviceId;
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
                    lastRequestedDeviceId = "";
                    await el.setSinkId("");
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

    $effect(() => {
        if (outputDeviceId && audioElement) {
            safeSetSinkId(outputDeviceId, audioElement).catch((e) => {
                console.error("Error setting the audio output device: ", e);
                Sentry.captureException(e);
            });
        }
    });

    let destroyed = false;

    let stream = $derived($streamStore ? $streamStore : undefined);
    let lastReportedPlaybackFailureStream: MediaStream | undefined;

    async function verifyAudioPlayback(element: HTMLAudioElement, mediaStream: MediaStream): Promise<void> {
        try {
            await element.play();
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;

            const expectedAutoplayBlock =
                error instanceof DOMException &&
                error.name === "NotAllowedError" &&
                navigator.userActivation?.hasBeenActive !== true;
            const details = {
                error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
                expectedAutoplayBlock,
                audioTracks: mediaStream.getAudioTracks().map(describeAudioTrack),
                audioContexts: getAudioContextDiagnostics(),
                playbackElements: getAudioPlaybackDiagnostics(mediaStream),
                visibilityState: document.visibilityState,
                documentHasFocus: document.hasFocus(),
            };
            if (expectedAutoplayBlock) {
                debug("Expected autoplay block", details);
            } else {
                console.warn("[AudioPlaybackDiagnostics] Audio element failed to play", details);
            }

            if (!expectedAutoplayBlock && lastReportedPlaybackFailureStream !== mediaStream) {
                lastReportedPlaybackFailureStream = mediaStream;
                Sentry.captureMessage("Remote audio element failed to play", {
                    level: "warning",
                    tags: {
                        component: "AudioPlaybackDiagnostics",
                    },
                    extra: details,
                });
            }
        }
    }

    $effect(() => {
        if (!audioElement || !stream) return;
        return registerAudioPlaybackElement(stream, audioElement);
    });

    $effect(() => {
        if (audioElement && stream) {
            if (audioElement.srcObject !== stream) {
                audioElement.srcObject = stream;
                verifyAudioPlayback(audioElement, stream).catch((error: unknown) => {
                    console.error("Unexpected audio playback diagnostic error", error);
                });
            }
        }
    });

    onMount(() => {
        (async () => {
            if (outputDeviceId && audioElement) {
                // Because of a bug in Chrome, we need to wait for setSinkId to resolve before setting the srcObject.
                await safeSetSinkId(outputDeviceId, audioElement);
                if (destroyed || !audioElement) {
                    return;
                }
                audioElement.srcObject = stream ?? null;
                audioElement.volume = $volume;
            }
        })().catch((e) => {
            console.error(e);
            Sentry.captureException(e);
        });
    });

    onDestroy(() => {
        destroyed = true;
    });
</script>

{#if !$isBlocked}
    <audio bind:this={audioElement} autoplay={true}></audio>
{/if}

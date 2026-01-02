<svelte:options immutable={true} />

<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import Debug from "debug";
    import * as Sentry from "@sentry/svelte";
    import type { Readable } from "svelte/store";

    export let streamStore: Readable<MediaStream | undefined>;
    export let outputDeviceId: string | undefined = undefined;
    export let isBlocked: Readable<boolean>;

    const debug = Debug("AudioStream");

    const dispatch = createEventDispatcher<{
        selectOutputAudioDeviceError: void;
    }>();

    export let volume: Readable<number>;
    let audioElement: HTMLAudioElement;

    $: {
        if (audioElement) {
            audioElement.volume = $volume;
        }
    }

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

                dispatch("selectOutputAudioDeviceError");
                return false;
            }
            console.error("Error setting the audio output device: ", e);
            return false;
        }
    }

    $: {
        if (outputDeviceId && audioElement) {
            safeSetSinkId(outputDeviceId, audioElement).catch((e) => {
                console.error("Error setting the audio output device: ", e);
                Sentry.captureException(e);
            });
        }
    }

    let destroyed = false;

    $: stream = $streamStore ? $streamStore : undefined;

    $: if (audioElement && stream) {
        if (audioElement.srcObject !== stream) {
            audioElement.srcObject = stream;
        }
    }

    onMount(() => {
        (async () => {
            if (outputDeviceId) {
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
    <audio bind:this={audioElement} autoplay={true} />
{/if}

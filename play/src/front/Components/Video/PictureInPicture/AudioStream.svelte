<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import CancelablePromise from "cancelable-promise";
    import Debug from "debug";

    export let attach: (container: HTMLAudioElement) => void;
    export let detach: (container: HTMLAudioElement) => void;
    export let outputDeviceId: string | undefined = undefined;

    const debug = Debug("AudioStream");

    const dispatch = createEventDispatcher<{
        selectOutputAudioDeviceError: void;
    }>();

    export let volume: number;
    let audioElement: HTMLAudioElement;

    $: {
        if (audioElement) {
            audioElement.volume = volume;
        }
    }

    // TODO: check the race condition when setting sinkId is solved.
    // Also, read: https://github.com/nwjs/nw.js/issues/4340

    $: {
        if (outputDeviceId && audioElement) {
            setAudioOutput(outputDeviceId, audioElement);
        }
    }

    // A promise to chain calls to setSinkId and setting the srcObject
    // setSinkId must be resolved before setting the srcObject. See Chrome bug, according to https://bugs.chromium.org/p/chromium/issues/detail?id=971947&q=setsinkid&can=2
    let sinkIdPromise = CancelablePromise.resolve();
    let currentDeviceId: string | undefined;
    let destroyed = false;

    //sets the ID of the audio device to use for output
    function setAudioOutput(deviceId: string, audioElement: HTMLAudioElement) {
        if (destroyed) {
            // In case this function is called in a promise that resolves after the component is destroyed,
            // let's ignore the call.
            console.warn("setAudioOutput called after the component was destroyed. Call is ignored.");
            return;
        }

        if (currentDeviceId === deviceId) {
            // No need to change the audio output if it's already the one we want.
            debug("setAudioOutput on already set deviceId. Ignoring call.");
            return;
        }
        currentDeviceId = deviceId;

        // The sinkId does not work for screensharing.
        // Check if the mediaStream has an audio track (if not it's a screensharing)
        //if (mediaStream?.getAudioTracks().length === 0) return;

        // Check HTMLMediaElement.setSinkId() compatibility for browser => https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId
        debug("Awaiting to set sink id to ", deviceId);
        sinkIdPromise = sinkIdPromise.then(async () => {
            debug("Setting Sink Id to ", deviceId);

            const timeOutPromise = new Promise((resolve) => {
                setTimeout(resolve, 2000, "timeout");
            });

            try {
                const setSinkIdRacePromise = Promise.race([timeOutPromise, audioElement.setSinkId?.(deviceId)]);

                let result = await setSinkIdRacePromise;
                if (result === "timeout") {
                    // In some rare case, setSinkId can NEVER return. I've seen this in Firefox on Linux with a Jabra.
                    // Let's fallback to default speaker if this happens.
                    console.warn("setSinkId timed out. Calling setSinkId again on default speaker.");
                    dispatch("selectOutputAudioDeviceError");
                    return;
                } else {
                    // eslint-disable-next-line require-atomic-updates
                    audioElement.volume = volume;
                    debug("Audio output device set to ", deviceId, "with volume", volume);
                    // Trying to set the stream again after setSinkId is set (for Chrome, according to https://bugs.chromium.org/p/chromium/issues/detail?id=971947&q=setsinkid&can=2)
                    /*if (videoElement && $streamStore) {
                        videoElement.srcObject = $streamStore;
                    }*/
                }
            } catch (e) {
                if (e instanceof DOMException && e.name === "AbortError") {
                    // An error occurred while setting the sinkId. Let's fallback to default.
                    console.warn("Error setting the audio output device. We fallback to default.");
                    dispatch("selectOutputAudioDeviceError");
                    return;
                }
                console.info("Error setting the audio output device: ", e);
            }
        });
    }

    onMount(() => {
        attach(audioElement);
        audioElement.volume = volume;
    });

    onDestroy(() => {
        detach(audioElement);
        sinkIdPromise.cancel();
    });
</script>

<audio bind:this={audioElement} autoplay={true} />

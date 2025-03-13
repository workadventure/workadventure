<script lang="ts">
    import CancelablePromise from "cancelable-promise";
    import Debug from "debug";
    import { createEventDispatcher, onDestroy } from "svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import CameraExclamationIcon from "../Icons/CameraExclamationIcon.svelte";
    import LL from "../../../i18n/i18n-svelte";

    /**
     * This component is in charge of displaying a <video> element in the center of the
     * container it is part of. It will rescale the video to fit the container both in
     * width and height, keeping the aspect ratio of the video.
     *
     * It also handles displaying a warning if no video frame is received after 3 seconds.
     *
     * Furthermore, it handles the audio output device for the video (if you pass an outputDeviceId)
     *
     * @slot - The content to display on top of the video.
     */

    const debug = Debug("CenteredVideo");

    const dispatch = createEventDispatcher();

    export let videoEnabled = false;
    export let mediaStream: MediaStream | undefined = undefined;

    // When expectVideoOutput switches to "true", the video stream should display something.
    // We are waiting for 3 seconds after the switch. If no video frame has arrived
    // by then, an error popup is displayed.
    export let expectVideoOutput = false;
    export let outputDeviceId: string | undefined = undefined;
    export let volume: number | undefined = undefined;
    // This impacts the video position in the container when the video uses the full width of the container.
    // If set to "top", the video will be at the top of the container. If set to "center", the video will be centered.
    export let verticalAlign: "center" | "top" = "center";
    export let isTalking = false;
    export let flipX = false;
    // If set to true, the video will be muted (no sound will come out). This does not prevent the volume bar from being displayed.
    export let muted = false;

    let destroyed = false;

    // Extend the HTMLVideoElement interface to add the setSinkId method.
    // See https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId
    interface HTMLVideoElementExt extends HTMLVideoElement {
        setSinkId?(deviceId: string): Promise<void>;
        requestVideoFrameCallback(callback: VideoFrameRequestCallback, options?: IdleRequestOptions): number;
    }

    let videoElement: HTMLVideoElementExt;

    function onLoadVideoElement() {}

    $: if (mediaStream && videoElement) {
        videoElement.srcObject = mediaStream;
    }

    let containerWidth: number;
    let containerHeight: number;
    let videoWidth: number;
    let videoHeight: number;
    let videoStreamWidth: number;
    let videoStreamHeight: number;
    let overlayWidth: number;
    let overlayHeight: number;

    $: {
        if (
            videoEnabled &&
            containerWidth &&
            containerHeight &&
            videoElement &&
            videoStreamWidth &&
            videoStreamHeight
        ) {
            const containerRatio = containerWidth / containerHeight;
            const videoRatio = videoStreamWidth / videoStreamHeight;

            //debug("videoRatio:" + videoRatio + "; containerRatio: " + containerRatio + "; containerWidth: " + containerWidth + "; containerHeight: " + containerHeight +" ; videoStreamWidth: " + videoStreamWidth + "; videoStreamHeight: " + videoStreamHeight);

            if (videoRatio < 1) {
                // In case we are on a mobile in portrait mode, we want to display a square video.
                videoWidth = containerHeight;
                videoHeight = containerHeight / videoRatio;
                overlayWidth = containerHeight;
                overlayHeight = containerHeight;
                //debug("videoRatio < 1: videoWidth: " + videoWidth + "; videoHeight: " + videoHeight);
            } else if (containerRatio > videoRatio) {
                videoWidth = containerHeight * videoRatio;
                videoHeight = containerHeight;
                overlayWidth = videoWidth;
                overlayHeight = videoHeight;
                //debug("containerRatio > videoRatio: videoWidth: " + videoWidth + "; videoHeight: " + videoHeight);
            } else {
                videoWidth = containerWidth;
                videoHeight = containerWidth / videoRatio;
                overlayWidth = videoWidth;
                overlayHeight = videoHeight;
                //debug("containerRatio <= videoRatio: videoWidth: " + videoWidth + "; videoHeight: " + videoHeight);
            }
        }
    }

    let noVideoTimeout: ReturnType<typeof setTimeout> | undefined;
    let displayNoVideoWarning = false;

    $: {
        if (expectVideoOutput && videoElement) {
            expectVideoWithin3Seconds();
        }
        if (!expectVideoOutput && noVideoTimeout) {
            clearTimeout(noVideoTimeout);
            noVideoTimeout = undefined;
        }
    }

    function expectVideoWithin3Seconds() {
        if ("requestVideoFrameCallback" in videoElement) {
            if (noVideoTimeout) {
                clearTimeout(noVideoTimeout);
            }
            // Let's wait 3 seconds before displaying a warning.
            noVideoTimeout = setTimeout(() => {
                displayNoVideoWarning = true;
                noVideoTimeout = undefined;
                analyticsClient.noVideoStreamReceived();
            }, 3000);

            videoElement.requestVideoFrameCallback(() => {
                // A video frame was displayed. No need to display a warning.
                displayNoVideoWarning = false;
                clearTimeout(noVideoTimeout);
                noVideoTimeout = undefined;
            });
        }
    }

    // TODO: check the race condition when setting sinkId is solved.
    // Also, read: https://github.com/nwjs/nw.js/issues/4340

    $: {
        if (outputDeviceId && videoElement) {
            setAudioOutput(outputDeviceId);
        }
    }

    // A promise to chain calls to setSinkId and setting the srcObject
    // setSinkId must be resolved before setting the srcObject. See Chrome bug, according to https://bugs.chromium.org/p/chromium/issues/detail?id=971947&q=setsinkid&can=2
    let sinkIdPromise = CancelablePromise.resolve();
    let currentDeviceId: string | undefined;

    //sets the ID of the audio device to use for output
    function setAudioOutput(deviceId: string) {
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

        // Check HTMLMediaElement.setSinkId() compatibility for browser => https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId
        debug("Awaiting to set sink id to ", deviceId);
        sinkIdPromise = sinkIdPromise.then(async () => {
            debug("Setting Sink Id to ", deviceId);

            const timeOutPromise = new Promise((resolve) => {
                setTimeout(resolve, 2000, "timeout");
            });

            try {
                const setSinkIdRacePromise = Promise.race([timeOutPromise, videoElement?.setSinkId?.(deviceId)]);

                let result = await setSinkIdRacePromise;
                if (result === "timeout") {
                    // In some rare case, setSinkId can NEVER return. I've seen this in Firefox on Linux with a Jabra.
                    // Let's fallback to default speaker if this happens.
                    console.warn("setSinkId timed out. Calling setSinkId again on default speaker.");
                    dispatch("selectOutputAudioDeviceError");
                    return;
                } else {
                    debug("Audio output device set to ", deviceId);
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

    onDestroy(() => {
        if (noVideoTimeout) {
            clearTimeout(noVideoTimeout);
            noVideoTimeout = undefined;
        }
        sinkIdPromise.cancel();
    });

    $: {
        if (volume !== undefined && videoElement) {
            videoElement.volume = volume;
        }
    }
</script>

<div class="h-full w-full relative" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
    <div
        class={"absolute overflow-hidden border-solid rounded-lg"}
        class:w-full={!videoEnabled}
        class:h-full={!videoEnabled}
        class:border-transparent={!isTalking}
        class:border-secondary={isTalking}
        style={videoEnabled
            ? "width: " +
              overlayWidth +
              "px; height: " +
              overlayHeight +
              "px; left: " +
              (containerWidth - overlayWidth) / 2 +
              "px;" +
              (verticalAlign === "center" ? " top: " + (containerHeight - overlayHeight) / 2 + "px;" : "")
            : ""}
    >
        <video
            style={videoEnabled
                ? "width: " +
                  Math.ceil(videoWidth) +
                  "px; height: " +
                  Math.ceil(videoHeight) +
                  "px; " +
                  (verticalAlign === "center" ? " top: " + (containerHeight - videoHeight) / 2 + "px;" : "") +
                  (flipX ? "-webkit-transform: scaleX(-1);transform: scaleX(-1);" : "")
                : ""}
            bind:videoWidth={videoStreamWidth}
            bind:videoHeight={videoStreamHeight}
            bind:this={videoElement}
            on:loadedmetadata={onLoadVideoElement}
            class="absolute block object-fill"
            class:h-0={!videoEnabled}
            class:w-0={!videoEnabled}
            autoplay
            playsinline
            {muted}
        />
    </div>
    {#if displayNoVideoWarning}
        <div
            class="absolute w-full aspect-video mx-auto flex justify-center items-center bg-danger text-white rounded-lg"
        >
            <div class="text-center">
                <CameraExclamationIcon />
                <div class="text-lg text-white bold">{$LL.video.no_video_stream_received()}</div>
                <div class="italic text-xs opacity-50">
                    {$LL.menu.sub.help()}
                </div>
            </div>
        </div>
    {/if}

    <!-- This div represents an overlay on top of the video -->
    <div
        class={"absolute border-solid " + (videoEnabled ? "" : "bg-contrast/80")}
        class:w-full={!videoEnabled}
        class:h-full={!videoEnabled}
        class:rounded-lg={!videoEnabled}
        class:border-transparent={(!videoEnabled && !isTalking) || videoEnabled}
        class:border-secondary={!videoEnabled && isTalking}
        style={videoEnabled
            ? "width: " +
              overlayWidth +
              "px; height: " +
              overlayHeight +
              "px; left: " +
              (containerWidth - overlayWidth) / 2 +
              "px;" +
              (verticalAlign === "center" ? " top: " + (containerHeight - overlayHeight) / 2 + "px;" : "")
            : ""}
    >
        <slot />
    </div>
</div>

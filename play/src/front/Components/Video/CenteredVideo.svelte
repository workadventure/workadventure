<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import CameraExclamationIcon from "../Icons/CameraExclamationIcon.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { VideoConfig } from "../../Api/Events/Ui/PlayVideoEvent";
    import { activePictureInPictureStore } from "../../Stores/PeerStore";

    /**
     * This component is in charge of displaying a <video> element in the center of the
     * container it is part of. It will rescale the video to fit the container both in
     * width and height, keeping the aspect ratio of the video.
     *
     * It also handles displaying a warning if no video frame is received after 3 seconds.
     *
     * @slot - The content to display on top of the video.
     */

    export let videoEnabled = false;
    export let attachVideo: ((container: HTMLVideoElement) => void) | undefined = undefined;
    export let detachVideo: ((container: HTMLVideoElement) => void) | undefined = undefined;
    export let videoUrl: string | undefined = undefined;
    export let videoConfig: VideoConfig | undefined = undefined;

    // When expectVideoOutput switches to "true", the video stream should display something.
    // We are waiting for 3 seconds after the switch. If no video frame has arrived
    // by then, an error popup is displayed.
    export let expectVideoOutput = false;
    // This impacts the video position in the container when the video uses the full width of the container.
    // If set to "top", the video will be at the top of the container. If set to "center", the video will be centered.
    export let verticalAlign: "center" | "top" = "center";
    export let isTalking = false;
    export let flipX = false;
    // If cover is true, the video will be stretched to cover the whole container (and some part of the video might be cropped).
    export let cover = true;
    // If true, the video will be displayed with a background is it does not cover the whole box
    export let withBackground = false;

    // Extend the HTMLVideoElement interface to add the setSinkId method.
    // See https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId
    interface HTMLVideoElementExt extends HTMLVideoElement {
        setSinkId?(deviceId: string): Promise<void>;
        requestVideoFrameCallback(callback: VideoFrameRequestCallback, options?: IdleRequestOptions): number;
    }

    let videoElement: HTMLVideoElementExt;

    let loop: boolean = videoConfig?.loop ?? false;

    function onLoadVideoElement() {}

    $: if (videoUrl && videoElement) {
        videoElement.src = videoUrl;
    }

    let containerWidth: number;
    let containerHeight: number;
    let videoWidth: number;
    let videoHeight: number;
    let videoStreamWidth: number;
    let videoStreamHeight: number;
    let overlayWidth: number;
    let overlayHeight: number;
    let videoRatio: number;

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
            // In case there is no video, we put an arbitrary ratio of 16/9 to avoid division by 0.
            videoRatio = videoStreamWidth && videoStreamHeight ? videoStreamWidth / videoStreamHeight : 16 / 9;

            //debug("videoRatio:" + videoRatio + "; containerRatio: " + containerRatio + "; containerWidth: " + containerWidth + "; containerHeight: " + containerHeight +" ; videoStreamWidth: " + videoStreamWidth + "; videoStreamHeight: " + videoStreamHeight);

            if (videoRatio < 1) {
                // In case we are on a mobile in portrait mode, we want to display a square video.
                videoWidth = containerHeight;
                videoHeight = containerHeight / videoRatio;
                overlayWidth = containerWidth;
                overlayHeight = containerHeight;
                //debug("videoRatio < 1: videoWidth: " + videoWidth + "; videoHeight: " + videoHeight);
            } else if (containerRatio > videoRatio) {
                if (!cover) {
                    videoWidth = containerHeight * videoRatio;
                    videoHeight = containerHeight;
                    overlayWidth = videoWidth;
                    overlayHeight = videoHeight;
                } else {
                    videoWidth = containerWidth;
                    videoHeight = containerWidth / videoRatio;
                    overlayWidth = containerWidth;
                    overlayHeight = containerHeight;
                }
                //debug("containerRatio > videoRatio: videoWidth: " + videoWidth + "; videoHeight: " + videoHeight);
            } else {
                if (!cover) {
                    videoWidth = containerWidth;
                    videoHeight = containerWidth / videoRatio;
                    overlayWidth = videoWidth;
                    overlayHeight = videoHeight;
                } else {
                    videoWidth = containerHeight * videoRatio;
                    videoHeight = containerHeight;
                    overlayWidth = containerWidth;
                    overlayHeight = containerHeight;
                }
                //debug("containerRatio <= videoRatio: videoWidth: " + videoWidth + "; videoHeight: " + videoHeight);
            }
        }
    }

    let noVideoTimeout: ReturnType<typeof setTimeout> | undefined;
    let displayNoVideoWarning = false;

    $: {
        if (expectVideoOutput && videoElement && attachVideo) {
            expectVideoWithin3Seconds();
        }
    }
    $: {
        if (!expectVideoOutput && noVideoTimeout) {
            clearTimeout(noVideoTimeout);
            noVideoTimeout = undefined;
        }
    }

    let callbackId: number | undefined;

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

            if (callbackId !== undefined && videoElement) {
                // We need to cancel the previous callback if it exists.
                videoElement.cancelVideoFrameCallback(callbackId);
            }
            callbackId = videoElement.requestVideoFrameCallback(() => {
                // A video frame was displayed. No need to display a warning.
                displayNoVideoWarning = false;
                clearTimeout(noVideoTimeout);
                noVideoTimeout = undefined;
                if (callbackId !== undefined && videoElement) {
                    // We need to cancel the previous callback if it exists.
                    videoElement.cancelVideoFrameCallback(callbackId);
                }
            });
        }
    }

    onMount(() => {
        // PictureInPicture has a tendency to make the no_video_stream_received message appear when it should not.
        // Not sure why, probably a bug due to the fact the video element is moved in the DOM.
        // We reset the displayNoVideoWarning flag when the PictureInPicture mode is changed.
        const unsubscriber = activePictureInPictureStore.subscribe(() => {
            clearTimeout(noVideoTimeout);
            noVideoTimeout = undefined;
            displayNoVideoWarning = false;
        });

        if (attachVideo) {
            attachVideo(videoElement);
        }

        return () => {
            unsubscriber();
        };
    });

    onDestroy(() => {
        if (noVideoTimeout) {
            clearTimeout(noVideoTimeout);
            noVideoTimeout = undefined;
        }

        if (detachVideo) {
            detachVideo(videoElement);
        }
    });
</script>

<div
    class="h-full w-full relative {(!cover || videoRatio < 1) && withBackground ? 'bg-contrast/80 rounded-lg' : ''}"
    bind:clientWidth={containerWidth}
    bind:clientHeight={containerHeight}
>
    <div
        class="absolute overflow-hidden border-solid rounded-lg"
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
                  ` top: ${(containerHeight - videoHeight) / 2 - (containerHeight - overlayHeight) / 2}px;` +
                  (cover
                      ? ` left: ${(containerWidth - videoWidth) / 2 - (containerWidth - overlayWidth) / 2}px;`
                      : "") +
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
            muted={true}
            {loop}
        />
    </div>
    {#if displayNoVideoWarning}
        <div
            class="absolute w-full h-full aspect-video mx-auto flex justify-center items-center bg-danger text-white rounded-lg"
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
        class={"absolute border-solid " + (videoEnabled || !withBackground ? "" : "bg-contrast/80 backdrop-blur")}
        class:w-full={!videoEnabled || displayNoVideoWarning}
        class:h-full={!videoEnabled || displayNoVideoWarning}
        class:rounded-lg={!videoEnabled || displayNoVideoWarning}
        class:border-transparent={(!videoEnabled && !isTalking) || videoEnabled}
        class:border-secondary={!videoEnabled && isTalking}
        class:hidden={videoEnabled && !overlayHeight}
        style={videoEnabled && !displayNoVideoWarning
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

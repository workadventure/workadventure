<script lang="ts">
    import CameraExclamationIcon from "../Icons/CameraExclamationIcon.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { Streamable } from "../../Stores/StreamableCollectionStore";
    import WebRtcVideo from "./VideoTags/WebRtcVideo.svelte";
    import LivekitVideo from "./VideoTags/LivekitVideo.svelte";
    import ScriptingVideo from "./VideoTags/ScriptingVideo.svelte";

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
    export let media: Streamable["media"];

    // This impacts the video position in the container when the video uses the full width of the container.
    // If set to "top", the video will be at the top of the container. If set to "center", the video will be centered.
    export let verticalAlign: "center" | "top" = "center";
    export let isTalking = false;
    export let flipX = false;
    // If cover is true, the video will be stretched to cover the whole container (and some part of the video might be cropped).
    export let cover = true;
    // If true, the video will be displayed with a background is it does not cover the whole box
    export let withBackground = false;

    function onLoadVideoElement() {}

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
        if (videoEnabled && containerWidth && containerHeight && videoStreamWidth && videoStreamHeight) {
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

    let displayNoVideoWarning = false;
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
        {#if media?.type === "webrtc"}
            <WebRtcVideo
                {media}
                {onLoadVideoElement}
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
                className={`absolute block object-fill ${videoEnabled ? "" : "h-0 w-0"}`}
                bind:videoWidth={videoStreamWidth}
                bind:videoHeight={videoStreamHeight}
                on:noVideo={() => {
                    displayNoVideoWarning = true;
                }}
                on:video={() => {
                    displayNoVideoWarning = false;
                }}
            />
        {:else if media?.type === "livekit" && media?.remoteVideoTrack}
            <LivekitVideo
                {...{
                    ...{},
                    /* @ts-ignore Typescript is not clever enough to understand that media has a non-nullable remoteVideoTrack */
                }}
                {media}
                {onLoadVideoElement}
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
                className={`absolute block object-fill ${videoEnabled ? "" : "h-0 w-0"}`}
                bind:videoWidth={videoStreamWidth}
                bind:videoHeight={videoStreamHeight}
                on:noVideo={() => {
                    displayNoVideoWarning = true;
                }}
                on:video={() => {
                    displayNoVideoWarning = false;
                }}
            />
        {:else if media?.type === "scripting"}
            <ScriptingVideo
                {media}
                {onLoadVideoElement}
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
                className={`absolute block object-fill ${videoEnabled ? "" : "h-0 w-0"}`}
                bind:videoWidth={videoStreamWidth}
                bind:videoHeight={videoStreamHeight}
            />
        {:else}
            <p>Unknown media type</p>
        {/if}
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

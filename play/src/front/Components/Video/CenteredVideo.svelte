<svelte:options immutable={true} />

<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import MegaphoneIcon from "../Icons/MegaphoneIcon.svelte";
    import WebRtcVideo from "./VideoTags/WebRtcVideo.svelte";
    import LivekitVideo from "./VideoTags/LivekitVideo.svelte";
    import ScriptingVideo from "./VideoTags/ScriptingVideo.svelte";
    import { IconCameraExclamation } from "@wa-icons";

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
    export let isBlocked = false;

    // If true, the video box is a megaphone space
    export let isMegaphoneSpace = false;

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
        if (videoEnabled && containerWidth && containerHeight) {
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
        class:border-yellow-200={isMegaphoneSpace}
        class:border-4={isMegaphoneSpace}
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
        <!-- If "isMegaphoneSpace" is true, add corner markers to the video box with megaphone icon -->
        {#if isMegaphoneSpace}
            <div
                class="absolute bottom-0 right-0 rounded-none rounded-tl-lg bg-yellow-200 backdrop-blur flex justify-center items-center gap-2 px-2 h-10 w-10 content-center z-[600]"
            >
                <MegaphoneIcon strokeColor="stroke-black" classList="mt-1 ml-1" />
            </div>
        {/if}

        {#if !isBlocked && videoEnabled}
            {#if media?.type === "webrtc"}
                <WebRtcVideo
                    {media}
                    {onLoadVideoElement}
                    style={"width: " +
                        Math.ceil(videoWidth) +
                        "px; height: " +
                        Math.ceil(videoHeight) +
                        "px; " +
                        ` top: ${(containerHeight - videoHeight) / 2 - (containerHeight - overlayHeight) / 2}px;` +
                        (cover
                            ? ` left: ${(containerWidth - videoWidth) / 2 - (containerWidth - overlayWidth) / 2}px;`
                            : "") +
                        (flipX ? "-webkit-transform: scaleX(-1);transform: scaleX(-1);" : "")}
                    className="absolute block object-fill"
                    bind:videoWidth={videoStreamWidth}
                    bind:videoHeight={videoStreamHeight}
                    on:noVideo={() => {
                        displayNoVideoWarning = true;
                    }}
                    on:video={() => {
                        displayNoVideoWarning = false;
                    }}
                />
            {:else if media?.type === "livekit"}
                <LivekitVideo
                    remoteVideoTrack={media.remoteVideoTrack}
                    {onLoadVideoElement}
                    style={"width: " +
                        Math.ceil(videoWidth) +
                        "px; height: " +
                        Math.ceil(videoHeight) +
                        "px; " +
                        ` top: ${(containerHeight - videoHeight) / 2 - (containerHeight - overlayHeight) / 2}px;` +
                        (cover
                            ? ` left: ${(containerWidth - videoWidth) / 2 - (containerWidth - overlayWidth) / 2}px;`
                            : "") +
                        (flipX ? "-webkit-transform: scaleX(-1);transform: scaleX(-1);" : "")}
                    className="absolute block object-fill"
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
                    style={"width: " +
                        Math.ceil(videoWidth) +
                        "px; height: " +
                        Math.ceil(videoHeight) +
                        "px; " +
                        ` top: ${(containerHeight - videoHeight) / 2 - (containerHeight - overlayHeight) / 2}px;` +
                        (cover
                            ? ` left: ${(containerWidth - videoWidth) / 2 - (containerWidth - overlayWidth) / 2}px;`
                            : "") +
                        (flipX ? "-webkit-transform: scaleX(-1);transform: scaleX(-1);" : "")}
                    className="absolute block object-fill"
                    bind:videoWidth={videoStreamWidth}
                    bind:videoHeight={videoStreamHeight}
                />
            {:else}
                <p>Unknown media type</p>
            {/if}
        {/if}
    </div>
    {#if displayNoVideoWarning}
        <div
            class="absolute w-full h-full aspect-video mx-auto flex justify-center items-center bg-danger text-white rounded-lg"
        >
            <div class="text-center">
                <IconCameraExclamation font-size="20" class="text-white" />
                <div class="text-lg text-white bold">{$LL.video.no_video_stream_received()}</div>
                <div class="italic text-xs opacity-50">
                    {$LL.menu.sub.help()}
                </div>
            </div>
        </div>
    {/if}

    <!-- This div represents an overlay on top of the video -->
    <div
        class={"absolute border-solid " +
            ((videoEnabled || !withBackground) && !isBlocked ? "" : "bg-contrast/80 backdrop-blur")}
        class:w-full={!videoEnabled || displayNoVideoWarning || isBlocked}
        class:h-full={!videoEnabled || displayNoVideoWarning || isBlocked}
        class:rounded-lg={!videoEnabled || displayNoVideoWarning || isBlocked}
        class:border-transparent={(!videoEnabled && !isTalking) || videoEnabled || isBlocked}
        class:border-secondary={(!videoEnabled && isTalking) || isBlocked}
        class:hidden={videoEnabled && !overlayHeight && !isBlocked}
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

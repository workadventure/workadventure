<script lang="ts">
    import type { Snippet } from "svelte";
    import LL from "../../../i18n/i18n-svelte";
    import MegaphoneIcon from "../Icons/MegaphoneIcon.svelte";
    import type { Streamable } from "../../Space/Streamable";
    import type { VideoBoxStatus } from "../../Space/VideoBox";
    import { activePictureInPictureStore } from "../../Stores/PeerStore";
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
    interface Props {
        videoEnabled: boolean;
        media: Streamable["media"];
        onvideo?: () => void;
        onnoVideo?: () => void;
        // If set to "top", the video will be at the top of the container. If set to "center", the video will be centered.
        verticalAlign: "center" | "top";
        isTalking: boolean;
        flipX: boolean;
        // If cover is true, the video will be stretched to cover the whole container (and some part of the video might be cropped).
        cover: boolean;
        // If true, the video will be displayed with a background is it does not cover the whole box
        withBackground: boolean;
        isBlocked: boolean;
        status: VideoBoxStatus;
        // If true, the video box is a megaphone space
        isMegaphoneSpace: boolean;
        children?: Snippet;
    }

    let {
        videoEnabled = false,
        media,
        onvideo,
        onnoVideo,
        verticalAlign = "center",
        isTalking = false,
        flipX = false,
        cover = true,
        withBackground = false,
        isBlocked = false,
        status = "connecting",
        isMegaphoneSpace = false,
        children,
    }: Props = $props();

    function handleVideo(): void {
        displayNoVideoWarning = false;
        onvideo?.();
    }

    function handleNoVideo(): void {
        displayNoVideoWarning = true;
        onnoVideo?.();
    }

    let containerWidth: number = $state(0);
    let containerHeight: number = $state(0);
    let videoWidth: number = $state(0);
    let videoHeight: number = $state(0);
    let videoStreamWidth: number = $state(0);
    let videoStreamHeight: number = $state(0);
    let overlayWidth: number = $state(0);
    let overlayHeight: number = $state(0);
    let videoRatio: number = $state(0);

    $effect(() => {
        if (videoEnabled && containerWidth && containerHeight) {
            const containerRatio = containerWidth / containerHeight;
            // In case there is no video, we put an arbitrary ratio of 16/9 to avoid division by 0.
            const currentVideoRatio =
                videoStreamWidth && videoStreamHeight ? videoStreamWidth / videoStreamHeight : 16 / 9;
            videoRatio = currentVideoRatio;

            //debug("videoRatio:" + videoRatio + "; containerRatio: " + containerRatio + "; containerWidth: " + containerWidth + "; containerHeight: " + containerHeight +" ; videoStreamWidth: " + videoStreamWidth + "; videoStreamHeight: " + videoStreamHeight);

            if (currentVideoRatio < 1) {
                if (!cover) {
                    videoWidth = containerHeight * currentVideoRatio;
                    videoHeight = containerHeight;
                    overlayWidth = videoWidth;
                    overlayHeight = videoHeight;
                } else {
                    // In case we are on a mobile in portrait mode, we want to display a square video.
                    videoWidth = containerHeight;
                    videoHeight = containerHeight / currentVideoRatio;
                    overlayWidth = containerWidth;
                    overlayHeight = containerHeight;
                    //debug("videoRatio < 1: videoWidth: " + videoWidth + "; videoHeight: " + videoHeight);
                }
            } else if (containerRatio > currentVideoRatio) {
                if (!cover) {
                    videoWidth = containerHeight * currentVideoRatio;
                    videoHeight = containerHeight;
                    overlayWidth = videoWidth;
                    overlayHeight = videoHeight;
                } else {
                    videoWidth = containerWidth;
                    videoHeight = containerWidth / currentVideoRatio;
                    overlayWidth = containerWidth;
                    overlayHeight = containerHeight;
                }
                //debug("containerRatio > videoRatio: videoWidth: " + videoWidth + "; videoHeight: " + videoHeight);
            } else {
                if (!cover) {
                    videoWidth = containerWidth;
                    videoHeight = containerWidth / currentVideoRatio;
                    overlayWidth = videoWidth;
                    overlayHeight = videoHeight;
                } else {
                    videoWidth = containerHeight * currentVideoRatio;
                    videoHeight = containerHeight;
                    overlayWidth = containerWidth;
                    overlayHeight = containerHeight;
                }
                //debug("containerRatio <= videoRatio: videoWidth: " + videoWidth + "; videoHeight: " + videoHeight);
            }
        }
    });

    let displayNoVideoWarning = $state(false);
</script>

<div
    class="h-full w-full relative {(!cover || videoRatio < 1) && withBackground ? 'bg-contrast/80 rounded-lg' : ''}"
    bind:clientWidth={containerWidth}
    bind:clientHeight={containerHeight}
    class:flex={$activePictureInPictureStore}
    class:flex-col={$activePictureInPictureStore}
    class:justify-center={$activePictureInPictureStore}
    class:transition-all={$activePictureInPictureStore}
    class:duration-100={$activePictureInPictureStore}
    class:ease-out={$activePictureInPictureStore}
>
    {#if media?.type === "component"}
        <div class="group/centered-video absolute inset-0 flex justify-center items-center overflow-hidden">
            {#if media.component}
                {@const MediaComponent = media.component}
                <MediaComponent
                    width={containerWidth ?? 320}
                    height={containerHeight ?? (containerWidth ?? 320) * (9 / 16)}
                />
            {/if}
        </div>
    {:else}
        <div
            class="absolute overflow-hidden border-solid rounded-lg"
            class:w-full={!videoEnabled}
            class:h-full={!videoEnabled}
            class:border-transparent={!isTalking}
            class:border-secondary={isTalking}
            class:border-yellow-200={isMegaphoneSpace}
            class:border-4={isMegaphoneSpace}
            class:transition-all={$activePictureInPictureStore}
            class:duration-100={$activePictureInPictureStore}
            class:ease-out={$activePictureInPictureStore}
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

            {#if !isBlocked && videoEnabled && status === "connected"}
                {#if media?.type === "webrtc"}
                    <WebRtcVideo
                        {media}
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
                        onvideo={handleVideo}
                        onnovideo={handleNoVideo}
                    />
                {:else if media?.type === "livekit"}
                    <LivekitVideo
                        {media}
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
                        onvideo={handleVideo}
                        onnovideo={handleNoVideo}
                    />
                {:else if media?.type === "scripting"}
                    <ScriptingVideo
                        {media}
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
            class={"group/centered-video absolute border-solid " +
                ((videoEnabled || !withBackground) && !isBlocked ? "" : "bg-contrast/80 backdrop-blur")}
            class:w-full={!videoEnabled || displayNoVideoWarning || isBlocked || status !== "connected"}
            class:h-full={!videoEnabled || displayNoVideoWarning || isBlocked || status !== "connected"}
            class:rounded-lg={!videoEnabled || displayNoVideoWarning || isBlocked || status !== "connected"}
            class:border-transparent={(!videoEnabled && !isTalking) || videoEnabled || isBlocked}
            class:border-secondary={(!videoEnabled && isTalking) || isBlocked}
            class:hidden={videoEnabled && !overlayHeight && !isBlocked && status !== "connected"}
            class:transition-all={$activePictureInPictureStore}
            class:duration-100={$activePictureInPictureStore}
            class:ease-out={$activePictureInPictureStore}
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
            {@render children?.()}
        </div>
    {/if}
</div>

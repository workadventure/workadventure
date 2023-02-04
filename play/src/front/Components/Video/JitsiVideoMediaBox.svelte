<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";

    import { onDestroy, onMount } from "svelte";
    import { isMediaBreakpointOnly, isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { JitsiTrackWrapper } from "../../Streaming/Jitsi/JitsiTrackWrapper";

    export let clickable = false;

    export let peer: JitsiTrackWrapper;

    //let embedScreen: EmbedScreen;
    let videoContainer: HTMLDivElement;
    let videoElement: HTMLVideoElement;
    let minimized = isMediaBreakpointOnly("md");
    let isMobile = isMediaBreakpointUp("md");

    /*if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }*/

    const resizeObserver = new ResizeObserver(() => {
        minimized = isMediaBreakpointOnly("md");
        isMobile = isMediaBreakpointUp("md");
    });

    onMount(() => {
        resizeObserver.observe(videoContainer);

        // TODO: Fix this
        console.warn("PEER:", peer);
        peer.videoTrack?.attach(videoElement);
    });

    onDestroy(() => {});
</script>

<div class="video-container" bind:this={videoContainer}>
    <div class="tw-flex tw-w-full tw-flex-col tw-h-full tw-border-orange tw-border-3 tw-border-solid">
        <video
            bind:this={videoElement}
            class:object-contain={isMobile || $embedScreenLayoutStore === LayoutMode.VideoChat}
            class="tw-h-full tw-max-w-full tw-rounded"
            autoplay
            playsinline
        />
    </div>
</div>

<style lang="scss">
    video.no-video {
        visibility: collapse;
    }

    video {
        object-fit: cover;
        &.object-contain {
            object-fit: contain;
        }
    }
</style>

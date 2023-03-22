<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";

    import { afterUpdate, onDestroy, onMount } from "svelte";
    import { isMediaBreakpointOnly, isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { JitsiTrackWrapper } from "../../Streaming/Jitsi/JitsiTrackWrapper";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import microphoneOffImg from "../images/microphone-off.png";

    import { Color } from "@workadventure/shared-utils";

    export const clickable = false;

    export let peer: JitsiTrackWrapper;

    //let embedScreen: EmbedScreen;
    let videoContainer: HTMLDivElement;
    let videoElement: HTMLVideoElement;
    let minimized = isMediaBreakpointOnly("md");
    let isMobile = isMediaBreakpointUp("md");

    let backGroundColor = Color.getColorByString("test");
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);

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
        attachTrack();
    });

    afterUpdate(() => {
        console.warn("PEER after Update:", peer);
        attachTrack();
    });

    function attachTrack() {
        peer.videoTrack?.attach(videoElement);
        //peer.audioTrack?.attach(videoElement);
    }

    onDestroy(() => {});
</script>

<div
    class="video-container tw-border-orange tw-border-2 tw-border-solid tw-relative tw-rounded"
    bind:this={videoContainer}
>
    {#if peer.videoTrack}
        <div class="tw-flex tw-w-full tw-flex-col tw-h-full">
            <video
                bind:this={videoElement}
                class:object-contain={isMobile || $embedScreenLayoutStore === LayoutMode.VideoChat}
                class="tw-h-full tw-max-w-full"
                autoplay
                playsinline
            />
        </div>
    {/if}
    <div class="tw-absolute tw-top-0.5 tw-right-1">
        {#if peer.audioTrack}
            <SoundMeterWidget
                classcss="voice-meter-cam-off tw-relative tw-mr-0 tw-ml-auto tw-translate-x-0 tw-transition-transform"
                barColor={textColor}
            />
        {:else}
            <img
                draggable="false"
                src={microphoneOffImg}
                class="tw-flex tw-p-1 tw-h-8 tw-w-8 voice-meter-cam-off tw-relative tw-mr-0 tw-ml-auto tw-translate-x-0 tw-transition-transform"
                alt="Mute"
                class:tw-brightness-0={textColor === "black"}
                class:tw-brightness-100={textColor === "white"}
            />
        {/if}
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

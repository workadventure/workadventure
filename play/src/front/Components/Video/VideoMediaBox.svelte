<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import type { VideoPeer } from "../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { getColorByString, getTextColorByBackgroundColor, srcObject } from "./utils";
    import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";

    import Woka from "../Woka/Woka.svelte";
    import { onMount } from "svelte";
    import { isMediaBreakpointOnly, isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import BanReportBox from "./BanReportBox.svelte";
    import microphoneOffImg from "../images/microphone-off-blue.png";
    import { LayoutMode } from "../../WebRtc/LayoutManager";

    export let clickable = false;

    export let peer: VideoPeer;
    let streamStore = peer.streamStore;
    let volumeStore = peer.volumeStore;
    let name = peer.userName;
    let backGroundColor = getColorByString(peer.userName);
    let textColor = getTextColorByBackgroundColor(backGroundColor);
    let statusStore = peer.statusStore;
    let constraintStore = peer.constraintsStore;

    let embedScreen: EmbedScreen;
    let videoContainer: HTMLDivElement;
    let minimized = isMediaBreakpointOnly("md");
    let isMobile = isMediaBreakpointUp("md");

    if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }

    const resizeObserver = new ResizeObserver(() => {
        minimized = isMediaBreakpointOnly("md");
        isMobile = isMediaBreakpointUp("md");
    });

    onMount(() => {
        resizeObserver.observe(videoContainer);
    });
</script>

<div
    class="video-container"
    bind:this={videoContainer}
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    <div
        class="tw-flex tw-w-full tw-flex-col tw-h-full"
        class:tw-justify-center={$statusStore === "connecting" || $statusStore === "error"}
        class:tw-items-center={$statusStore === "connecting" || $statusStore === "error"}
    >
        {#if $statusStore === "connecting"}
            <div class="connecting-spinner" />
        {:else if $statusStore === "error"}
            <div class="rtc-error" />
        {/if}
        <!-- svelte-ignore a11y-media-has-caption &ndash;&gt;-->
        {#if $streamStore}
            <video
                class:no-video={!$constraintStore || $constraintStore.video === false}
                class:object-contain={isMobile || $embedScreenLayoutStore === LayoutMode.VideoChat}
                class="tw-h-full tw-max-w-full tw-rounded"
                style={$embedScreenLayoutStore === LayoutMode.Presentation
                    ? `border: solid 2px ${backGroundColor}`
                    : ""}
                use:srcObject={$streamStore}
                autoplay
                playsinline
            />
        {/if}

        <div
            class="nametag-webcam-container container-end media-box-camera-on-size video-on-responsive-height
  "
        >
            <i class="tw-flex">
                <span
                    style="background-color: {backGroundColor}; color: {textColor};"
                    class="nametag-text nametag-shape tw-pr-3 tw-pl-5 tw-h-4 tw-max-h-8">{name}</span
                >
            </i>
        </div>
        <div class="woka-webcam-container container-end video-on-responsive-height tw-pb-1 tw-left-0">
            <div
                class="tw-flex {($constraintStore && $constraintStore.video !== false) || minimized ? '' : 'no-video'}"
            >
                <Woka userId={peer.userId} placeholderSrc={""} customHeight="20px" customWidth="20px" />
            </div>
        </div>
        {#if $constraintStore && $constraintStore.audio !== false}
            <div
                class="voice-meter-webcam-container media-box-camera-off-size tw-flex tw-flex-col tw-absolute tw-items-end tw-pr-2"
            >
                <SoundMeterWidget volume={$volumeStore} classcss="tw-absolute" barColor="blue" />
            </div>
        {:else}
            <div
                class="voice-meter-webcam-container media-box-camera-off-size tw-flex tw-flex-col tw-absolute tw-items-end tw-pr-2"
            >
                <img draggable="false" src={microphoneOffImg} class="tw-flex tw-p-1 tw-h-8 tw-w-8" alt="Mute" />
            </div>
        {/if}
        <div
            class="report-ban-container tw-flex tw-z-[600] media-box-camera-on-size media-box-camera-on-position
            tw-translate-x-3 tw-transition-all tw-opacity-0"
        >
            <BanReportBox {peer} />
        </div>
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

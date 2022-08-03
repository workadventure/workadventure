<script lang="ts">
    import type { VideoPeer } from "../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { showReportScreenStore } from "../../Stores/ShowReportScreenStore";
    import { getColorByString, getTextColorByBackgroundColor, srcObject } from "./utils";
    import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";

    import Woka from "../Woka/Woka.svelte";
    import { onMount } from "svelte";
    import { isMediaBreakpointOnly } from "../../Utils/BreakpointsUtils";
    import BanReportBox from "./BanReportBox.svelte";

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

    if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }

    const resizeObserver = new ResizeObserver(() => {
        minimized = isMediaBreakpointOnly("md");
    });

    onMount(() => {
        resizeObserver.observe(videoContainer);
    });
</script>

<div
    class="video-container"
    class:no-clikable={!clickable}
    bind:this={videoContainer}
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    <div
        class="screen-blocker tw-flex tw-w-full tw-flex-col tw-h-full"
        class:tw-justify-center={$statusStore === "connecting" || $statusStore === "error"}
        class:tw-items-center={$statusStore === "connecting" || $statusStore === "error"}
    >
        {#if $statusStore === "connecting"}
            <div class="connecting-spinner" />
        {:else if $statusStore === "error"}
            <div class="rtc-error" />
        {/if}
        <!-- svelte-ignore a11y-media-has-caption &ndash;&gt;-->
        <video
            class:no-video={!$constraintStore || $constraintStore.video === false}
            class="tw-h-full tw-max-w-full tw-rounded"
            use:srcObject={$streamStore}
            autoplay
            playsinline
        />

        <div
            class="nametag-webcam-container tw-flex tw-flex-col tw-absolute tw-justify-end
tw-h-32 tw-w-56 sm:tw-h-48 sm:tw-w-80 md:tw-h-20 md:tw-w-36 lg:tw-h-24 lg:tw-w-44 xl:tw-h-36 xl:tw-w-64 2xl:tw-h-48 2xl:tw-w-96
  tw-h-32 sm:tw-h-48 md:tw-h-20 lg:tw-h-24 xl:tw-h-36 2xl:tw-h-48
  "
        >
            <i class="tw-flex">
                <span
                    style="background-color: {backGroundColor}; color: {textColor};"
                    class="tw-rounded-tr-lg tw-pr-3 tw-pl-8 lg:tw-py-1 tw-font-semibold tw-text-sm lg:tw-text-base tw-not-italic tw-max-h-8 tw-overflow-auto tw-break-words tw-max-w-full"
                    >{name}</span
                >
            </i>
        </div>
        <div
            class="woka-webcam-container tw-flex tw-flex-col tw-absolute tw-justify-end
  tw-h-32 sm:tw-h-48 md:tw-h-20 lg:tw-h-24 xl:tw-h-36 2xl:tw-h-48 tw-pb-2
  "
        >
            <div class="tw-flex{($constraintStore && $constraintStore.video !== false) || minimized ? '' : 'no-video'}">
                <Woka userId={peer.userId} placeholderSrc={""} customHeight="32px" customWidth="32px" />
            </div>
        </div>
        {#if $constraintStore && $constraintStore.audio !== false}
            <div
                class="voice-meter-webcam-container tw-flex tw-flex-col tw-absolute tw-items-end tw-pr-2
    tw-flex tw-w-56 sm:tw-w-80 md:tw-w-36 lg:tw-w-44 xl:tw-w-64 2xl:tw-w-96
  "
            >
                <SoundMeterWidget volume={$volumeStore} classcss="tw-absolute" />
            </div>
        {/if}
        <div class="report-ban-container tw-z-[600] tw-h-32 tw-w-56 sm:tw-h-48 sm:tw-w-80 md:tw-h-20 md:tw-w-36 lg:tw-h-24 lg:tw-w-44 xl:tw-h-36 xl:tw-w-64 2xl:tw-h-48 2xl:tw-w-96
        tw-absolute
">
            <BanReportBox peer={peer}/>
        </div>
    </div>
</div>

<style lang="scss">
  //Higlighted and hovered styles are defined in style/style.css (look for 'media-container')
    video.no-video {
        visibility: collapse;
    }
</style>

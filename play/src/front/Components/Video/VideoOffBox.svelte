<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import type { VideoPeer } from "../../WebRtc/VideoPeer";
    import { getColorByString, getTextColorByBackgroundColor } from "./utils";
    import Woka from "../Woka/Woka.svelte";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import { onMount } from "svelte";
    import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
    import BanReportBox from "./BanReportBox.svelte";
    import microphoneOffImg from "../images/microphone-off.png";

    let videoContainer: HTMLDivElement;
    export let peer: VideoPeer;
    export let clickable = false;

    let name = peer.userName;
    let backGroundColor = getColorByString(peer.userName);
    let textColor = getTextColorByBackgroundColor(backGroundColor);
    let volumeStore = peer.volumeStore;

    let embedScreen: EmbedScreen;

    if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }

    const resizeObserver = new ResizeObserver(() => {
        return;
    });

    onMount(() => {
        resizeObserver.observe(videoContainer);
    });

    let constraintStore = peer.constraintsStore;
</script>

<div
    class="video-container video-off"
    class:no-clikable={!clickable}
    bind:this={videoContainer}
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    <div
        style="background-color: {backGroundColor}; color: {textColor}"
        class="tw-w-full tw-rounded tw-px-3 tw-flex tw-flex-row tw-items-center"
    >
        <Woka userId={peer.userId} placeholderSrc={""} customHeight="32px" customWidth="32px" />
        <span class="tw-font-semibold tw-text-sm tw-not-italic tw-break-words tw-px-2 tw-overflow-y-auto tw-max-h-10"
            >{name}</span
        >
        {#if $constraintStore && $constraintStore.audio !== false}
            <SoundMeterWidget
                volume={$volumeStore}
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
        <div class="tw-flex report-ban-container-cam-off media-box-camera-off-size tw-opacity-0 tw-h-10">
            <BanReportBox {peer} />
        </div>
    </div>
</div>

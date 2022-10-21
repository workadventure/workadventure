<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import { getColorByString, getTextColorByBackgroundColor } from "./utils";
    import Woka from "../Woka/Woka.svelte";
    import { Streamable } from "../../Stores/StreamableCollectionStore";
    import { onMount } from "svelte";
    import { EmbedScreen, embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
    import BanReportBox from "./BanReportBox.svelte";
    import microphoneOffImg from "../images/microphone-off.png";
    import { LayoutMode } from "../../WebRtc/LayoutManager";

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
    bind:this={videoContainer}
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    <div
        style={`border: solid 2px ${backGroundColor}; color: ${textColor}; background-color: ${backGroundColor}; color: ${textColor}`}
        class="tw-items-center tw-px-3 tw-w-full tw-rounded tw-flex tw-flex-row tw-relative"
    >
        <Woka userId={peer.userId} placeholderSrc={""} customHeight="32px" customWidth="32px" />
        <span
            style={$embedScreenLayoutStore === LayoutMode.VideoChat
                ? `background-color: ${backGroundColor}; color: ${textColor}`
                : ""}
            class="tw-font-semibold tw-text-sm tw-not-italic tw-break-words tw-px-2 tw-overflow-y-auto tw-max-h-10"
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
        <div class="tw-w-full tw-flex report-ban-container-cam-off tw-opacity-0 tw-h-10">
            <BanReportBox {peer} />
        </div>
    </div>
</div>

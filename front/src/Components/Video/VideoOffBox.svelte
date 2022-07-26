<script lang="ts">
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import { getColorByString, getTextColorByBackgroundColor } from "./utils";
    import Woka from "../Woka/Woka.svelte";
    import { isMediaBreakpointOnly } from "../../Utils/BreakpointsUtils";
    import { Streamable } from "../../Stores/StreamableCollectionStore";
    import { onMount } from "svelte";
    import { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
    import BanReportBox from "./BanReportBox.svelte";

    let videoContainer: HTMLDivElement;
    export let peer: VideoPeer;
    export let clickable = false;

    let name = peer.userName;
    let backGroundColor = getColorByString(peer.userName);
    let textColor = getTextColorByBackgroundColor(backGroundColor);
    let volumeStore = peer.volumeStore;

    let embedScreen: EmbedScreen;
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
        style="background-color: {backGroundColor}; color: {textColor}"
        class="tw-w-full tw-rounded tw-px-3 tw-flex tw-flex-row tw-items-center"
    >
        <Woka userId={peer.userId} placeholderSrc={""} customHeight="32px" customWidth="32px" />
        <span
            class="tw-font-semibold tw-text-sm lg:tw-text-base tw-not-italic tw-px-2 tw-break-words tw-overflow-y-auto tw-max-h-10"
            >{name}</span
        >
        <SoundMeterWidget volume={$volumeStore} classcss="tw-relative tw-mr-0 tw-ml-auto" />
        <BanReportBox peer={peer}/>
    </div>
</div>

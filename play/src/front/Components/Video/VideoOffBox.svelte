<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import type { VideoPeer } from "../../WebRtc/VideoPeer";
    import { getColorByString, getTextColorByBackgroundColor, srcObject } from "./utils";
    import Woka from "../Woka/Woka.svelte";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import { onMount } from "svelte";
    import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
    import BanReportBox from "./BanReportBox.svelte";
    import microphoneOffImg from "../images/microphone-off.png";
    import { LayoutMode } from "../../WebRtc/LayoutManager";

    let videoContainer: HTMLDivElement;
    export let peer: VideoPeer;
    export let clickable = false;

    let streamStore = peer.streamStore;
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
        class="items-center px-3 w-full rounded flex flex-row relative"
    >
        <Woka userId={peer.userId} placeholderSrc={""} customHeight="32px" customWidth="32px" />
        <!-- svelte-ignore a11y-media-has-caption &ndash;&gt;-->
        {#if $streamStore}
            <video
                class="h-0 w-0"
                style={$embedScreenLayoutStore === LayoutMode.Presentation
                    ? `border: solid 2px ${backGroundColor}`
                    : ""}
                use:srcObject={$streamStore}
                autoplay
                playsinline
            />
        {/if}
        <span
            style={$embedScreenLayoutStore === LayoutMode.VideoChat
                ? `background-color: ${backGroundColor}; color: ${textColor}`
                : ""}
            class="font-semibold text-sm not-italic break-words px-2 overflow-y-auto max-h-10"
            >{name}</span
        >
        {#if $constraintStore && $constraintStore.audio !== false}
            <SoundMeterWidget
                volume={$volumeStore}
                classcss="voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                barColor={textColor}
            />
        {:else}
            <img
                draggable="false"
                src={microphoneOffImg}
                class="flex p-1 h-8 w-8 voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                alt="Mute"
                class:brightness-0={textColor === "black"}
                class:brightness-100={textColor === "white"}
            />
        {/if}
        <div class="w-full flex report-ban-container-cam-off opacity-0 h-10">
            <BanReportBox {peer} />
        </div>
    </div>
</div>

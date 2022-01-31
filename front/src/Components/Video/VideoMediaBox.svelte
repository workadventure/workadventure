<script lang="ts">
    import type { VideoPeer } from "../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import microphoneCloseImg from "../images/microphone-close.svg";
    import reportImg from "./images/report.svg";
    import blockSignImg from "./images/blockSign.svg";
    import { showReportScreenStore } from "../../Stores/ShowReportScreenStore";
    import { getColorByString, srcObject } from "./utils";
    import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";

    import Woka from "../Woka/Woka.svelte";
    import { onMount } from "svelte";
    import { isMediaBreakpointOnly } from "../../Utils/BreakpointsUtils";

    export let clickable = false;

    export let peer: VideoPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let statusStore = peer.statusStore;
    let constraintStore = peer.constraintsStore;

    function openReport(peer: VideoPeer): void {
        showReportScreenStore.set({ userId: peer.userId, userName: peer.userName });
    }

    let embedScreen: EmbedScreen;
    let videoContainer: HTMLDivElement;
    let minimized = isMediaBreakpointOnly("md");

    if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }

    function noDrag() {
        return false;
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
    {#if $statusStore === "connecting"}
        <div class="connecting-spinner" />
    {/if}
    {#if $statusStore === "error"}
        <div class="rtc-error" />
    {/if}
    <!-- {#if !$constraintStore || $constraintStore.video === false} -->
    <i class="container">
        <span style="background-color: {getColorByString(name)};">{name}</span>
    </i>
    <div class="woka-icon {($constraintStore && $constraintStore.video !== false) || minimized ? '' : 'no-video'}">
        <Woka userId={peer.userId} placeholderSrc={""} />
    </div>
    <!-- {/if} -->
    {#if $constraintStore && $constraintStore.audio === false}
        <img
            src={microphoneCloseImg}
            class="active noselect"
            draggable="false"
            on:dragstart|preventDefault={noDrag}
            alt="Muted"
        />
    {/if}
    <button class="report" on:click={() => openReport(peer)}>
        <img alt="Report this user" draggable="false" on:dragstart|preventDefault={noDrag} src={reportImg} />
        <span class="noselect">Report/Block</span>
    </button>
    <!-- svelte-ignore a11y-media-has-caption -->
    <video
        class:no-video={!$constraintStore || $constraintStore.video === false}
        use:srcObject={$streamStore}
        autoplay
        playsinline
        on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
    />
    <img src={blockSignImg} draggable="false" on:dragstart|preventDefault={noDrag} class="block-logo" alt="Block" />
    {#if $constraintStore && $constraintStore.audio !== false}
        <SoundMeterWidget stream={$streamStore} />
    {/if}
</div>

<style lang="scss">
    .container {
        display: flex;
        flex-direction: column;
    }
    video.no-video {
        visibility: collapse;
    }
</style>

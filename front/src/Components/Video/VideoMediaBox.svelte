<script lang="ts">
    import type { VideoPeer } from "../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import microphoneCloseImg from "../images/microphone-close.svg";
    import reportImg from "./images/report.svg";
    import blockSignImg from "./images/blockSign.svg";
    import { videoFocusStore } from "../../Stores/VideoFocusStore";
    import { showReportScreenStore } from "../../Stores/ShowReportScreenStore";
    import { getColorByString, srcObject } from "./utils";

    import Woka from "../Woka/Woka.svelte";

    export let peer: VideoPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let statusStore = peer.statusStore;
    let constraintStore = peer.constraintsStore;

    function openReport(peer: VideoPeer): void {
        showReportScreenStore.set({ userId: peer.userId, userName: peer.userName });
    }
</script>

<div class="video-container">
    {#if $statusStore === "connecting"}
        <div class="connecting-spinner" />
    {/if}
    {#if $statusStore === "error"}
        <div class="rtc-error" />
    {/if}
    <!-- {#if !$constraintStore || $constraintStore.video === false} -->
    <i
        class="container {!$constraintStore || $constraintStore.video === false ? '' : 'minimized'}"
        style="background-color: {getColorByString(name)};"
    >
        <span>{peer.userName}</span>
        <div class="woka-icon"><Woka userId={peer.userId} placeholderSrc={""} /></div>
    </i>
    <!-- {/if} -->
    {#if $constraintStore && $constraintStore.audio === false}
        <img src={microphoneCloseImg} class="active" alt="Muted" />
    {/if}
    <button class="report" on:click={() => openReport(peer)}>
        <img alt="Report this user" src={reportImg} />
        <span>Report/Block</span>
    </button>
    <!-- svelte-ignore a11y-media-has-caption -->
    <video use:srcObject={$streamStore} autoplay playsinline on:click={() => videoFocusStore.toggleFocus(peer)} />
    <img src={blockSignImg} class="block-logo" alt="Block" />
    {#if $constraintStore && $constraintStore.audio !== false}
        <SoundMeterWidget stream={$streamStore} />
    {/if}
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        padding-top: 15px;
    }

    .minimized {
        left: auto;
        transform: scale(0.5);
        opacity: 0.5;
    }

    .woka-icon {
        margin-right: 3px;
    }
</style>

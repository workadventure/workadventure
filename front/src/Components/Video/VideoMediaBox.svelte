<script lang="ts">
    import type {VideoPeer} from "../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import microphoneCloseImg from "../images/microphone-close.svg";
    import reportImg from "./images/report.svg";
    import blockSignImg from "./images/blockSign.svg";
    import {videoFocusStore} from "../../Stores/VideoFocusStore";
    import {showReportScreenStore} from "../../Stores/ShowReportScreenStore";
    import {getColorByString, srcObject} from "./utils";

    export let peer: VideoPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let statusStore = peer.statusStore;
    let constraintStore = peer.constraintsStore;

    function openReport(peer: VideoPeer): void {
        showReportScreenStore.set({ userId:peer.userId, userName: peer.userName });
    }

</script>

<div class="video-container">
    {#if $statusStore === 'connecting'}
        <div class="connecting-spinner"></div>
    {/if}
    {#if $statusStore === 'error'}
        <div class="rtc-error"></div>
    {/if}
    {#if !$constraintStore || $constraintStore.video === false}
        <i style="background-color: {getColorByString(name)};">{name}</i>
    {/if}
    {#if $constraintStore && $constraintStore.audio === false}
        <img src={microphoneCloseImg} alt="Muted">
    {/if}
    <button class="report" on:click={() => openReport(peer)}>
        <img alt="Report this user" src={reportImg}>
        <span>Report/Block</span>
    </button>
    {#if $streamStore }
    <video use:srcObject={$streamStore} autoplay playsinline on:click={() => videoFocusStore.toggleFocus(peer)}></video>
    {/if}
    <img src={blockSignImg} class="block-logo" alt="Block" />
    {#if $constraintStore && $constraintStore.audio !== false}
        <SoundMeterWidget stream={$streamStore}></SoundMeterWidget>
    {/if}
</div>


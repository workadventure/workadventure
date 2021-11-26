<script lang="ts">
    import type { VideoPeer } from "../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import microphoneCloseImg from "../images/microphone-close.svg";
    import reportImg from "./images/report.svg";
    import blockSignImg from "./images/blockSign.svg";
    import { videoFocusStore } from "../../Stores/VideoFocusStore";
    import { showReportScreenStore } from "../../Stores/ShowReportScreenStore";
    import { userWokaPictureStore } from "../../Stores/UserWokaPictureStore";
    import { getColorByString, srcObject } from "./utils";
    import { onDestroy } from "svelte";

    export let peer: VideoPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let statusStore = peer.statusStore;
    let constraintStore = peer.constraintsStore;

    let userWokaPictureSrc: string | undefined = undefined;

    const unsubscribeFromUserWokaPictureStore = userWokaPictureStore.subscribe((playersAvatars) => {
        userWokaPictureSrc = playersAvatars.get(peer.userId);
        console.log(userWokaPictureSrc);
    });

    function openReport(peer: VideoPeer): void {
        showReportScreenStore.set({ userId: peer.userId, userName: peer.userName });
    }

    onDestroy(unsubscribeFromUserWokaPictureStore);
</script>

<div class="video-container">
    {#if $statusStore === "connecting"}
        <div class="connecting-spinner" />
    {/if}
    {#if $statusStore === "error"}
        <div class="rtc-error" />
    {/if}
    {#if !$constraintStore || $constraintStore.video === false}
        <i style="background-color: {getColorByString(name)};">
            {#if !userWokaPictureSrc}
                {name}
            {:else}
                <img src={userWokaPictureSrc} class="user-woka-picture" alt="player avatar" />
            {/if}
        </i>
    {/if}
    {#if $constraintStore && $constraintStore.audio === false}
        <img src={microphoneCloseImg} class="active" alt="Muted" />
    {/if}
    <button class="report" on:click={() => openReport(peer)}>
        <img alt="Report this user" src={reportImg} />
        <span>Report/Block</span>
    </button>
    <video use:srcObject={$streamStore} autoplay playsinline on:click={() => videoFocusStore.toggleFocus(peer)} />
    <img src={blockSignImg} class="block-logo" alt="Block" />
    {#if $constraintStore && $constraintStore.audio !== false}
        <SoundMeterWidget stream={$streamStore} />
    {/if}
</div>

<style lang="scss">
    .user-woka-picture {
        display: block;
        left: calc(50% - 45px);
        top: calc(50% - 45px);
        width: 90px;
        height: 90px;
        image-rendering: pixelated;
    }
</style>
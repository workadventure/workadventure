<script lang="ts">
    import { Color } from "@workadventure/shared-utils";
    import { Readable, Unsubscriber } from "svelte/store";
    import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
    import { onDestroy, onMount } from "svelte";
    import microphoneOffImg from "../images/microphone-off.png";
    import { EmbedScreen, highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { Streamable, myJitsiCameraStore } from "../../Stores/StreamableCollectionStore";
    import SoundMeterWidgetWrapper from "../SoundMeterWidgetWrapper.svelte";
    import { JitsiTrackStreamWrapper } from "../../Streaming/Jitsi/JitsiTrackStreamWrapper";
    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import LL from "../../../i18n/i18n-svelte";
    import Woka from "../Woka/Woka.svelte";
    import UserTag from "./UserTag.svelte";
    import JitsiVideoElement from "./JitsiVideoElement.svelte";
    import JitsiAudioElement from "./JitsiAudioElement.svelte";
    import ActionMediaBox from "./ActionMediaBox.svelte";

    export let clickable = true;
    export let isHightlighted = false;
    export let peer: JitsiTrackStreamWrapper;

    const videoTrackStore: Readable<JitsiTrack | undefined> = peer.videoTrackStore;
    const audioTrackStore: Readable<JitsiTrack | undefined> = peer.audioTrackStore;

    let embedScreen: EmbedScreen;
    let backGroundColor = Color.getColorByString(peer.jitsiTrackWrapper.spaceUser?.name ?? "");
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);

    if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }

    let jitsiMediaBoxHtml: HTMLDivElement;
    let isMobileFormat = isMediaBreakpointUp("md");
    const resizeObserver = new ResizeObserver(() => {
        isMobileFormat = isMediaBreakpointUp("md");
    });

    let videoTrackUnSuscriber: Unsubscriber;

    onMount(() => {
        resizeObserver.observe(jitsiMediaBoxHtml);
        videoTrackUnSuscriber = videoTrackStore.subscribe((videoTrack) => {
            if (videoTrack == undefined && isHightlighted) highlightedEmbedScreen.toggleHighlight(embedScreen);
        });
    });

    onDestroy(() => {
        resizeObserver.unobserve(jitsiMediaBoxHtml);
        if (videoTrackUnSuscriber) videoTrackUnSuscriber();
    });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    id="container"
    class="jitsi-video"
    bind:this={jitsiMediaBoxHtml}
    on:click={() => analyticsClient.pinMeetingAction()}
    on:click={() =>
        clickable && $videoTrackStore && $videoTrackStore?.isActive()
            ? highlightedEmbedScreen.toggleHighlight(embedScreen)
            : null}
>
    {#if $myJitsiCameraStore?.uniqueId != peer.uniqueId}
        <ActionMediaBox
            {embedScreen}
            trackStreamWraper={peer}
            videoEnabled={$videoTrackStore ? $videoTrackStore?.isActive() : false}
        />
    {/if}
    {#if $videoTrackStore}
        <div class="tw-rounded-sm tw-overflow-hidden tw-flex tw-justify-center tw-flex-col tw-w-full tw-h-full">
            <JitsiVideoElement
                jitsiTrack={$videoTrackStore}
                isLocal={$videoTrackStore?.isLocal()}
                {isHightlighted}
                {isMobileFormat}
            />
        </div>
    {/if}
    {#if peer.target === "video/audio"}
        <div class={`tw-absolute ${$videoTrackStore ? "tw-top-0.5 tw-right-2" : "tw-top-1 tw-right-3"}`}>
            {#if $audioTrackStore}
                <JitsiAudioElement jitsiTrack={$audioTrackStore} />
                <SoundMeterWidgetWrapper
                    classcss="tw-relative tw-mr-0 tw-ml-auto tw-translate-x-0 tw-transition-transform"
                    barColor={$videoTrackStore ? "blue" : "black"}
                    volume={peer.jitsiTrackWrapper.volumeStore}
                />
            {:else}
                <img
                    draggable="false"
                    src={microphoneOffImg}
                    class="tw-flex tw-p-1 tw-h-8 tw-w-8 voice-meter-cam-off tw-relative tw-mr-0 tw-ml-auto tw-translate-x-0 tw-transition-transform"
                    alt="Mute"
                    class:tw-brightness-0={textColor === "black" && !$videoTrackStore}
                    class:tw-brightness-100={textColor === "white" && !$videoTrackStore}
                />
            {/if}
        </div>
    {/if}
    {#if peer.jitsiTrackWrapper.spaceUser}
        {#await peer.jitsiTrackWrapper.spaceUser?.getWokaBase64()}
            <div />
        {:then wokaBase64}
            {#if $embedScreenLayoutStore === LayoutMode.VideoChat && $videoTrackStore == undefined}
                <div
                    id="tag"
                    style="background-color: {backGroundColor}; color: {textColor};"
                    class="tw-flex tw-flex-col tw-justify-center tw-items-center tw-content-center !tw-h-full tw-w-full tw-gap-2"
                >
                    <Woka src={wokaBase64} customHeight={`100px`} customWidth={`100px`} />
                    <span
                        class="tw-font-semibold tw-text-sm tw-not-italic tw-break-words tw-px-2 tw-overflow-y-auto tw-max-h-10"
                    >
                        {peer.jitsiTrackWrapper.isLocal
                            ? $LL.camera.my.nameTag()
                            : peer.jitsiTrackWrapper.spaceUser?.name}
                    </span>
                </div>
            {:else}
                <UserTag
                    isMe={peer.jitsiTrackWrapper.isLocal}
                    name={peer.jitsiTrackWrapper.spaceUser?.name ?? ""}
                    wokaSrc={wokaBase64}
                    minimal={!!$videoTrackStore}
                />
            {/if}
        {/await}
    {/if}
</div>

<style lang="scss">
    /*    video.no-video {
        visibility: collapse;
    }*/
</style>

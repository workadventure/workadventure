<script lang="ts">
    import { Color } from "@workadventure/shared-utils";
    import { Readable, Unsubscriber } from "svelte/store";
    import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
    import { onDestroy, onMount } from "svelte";

    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { Streamable, myJitsiCameraStore } from "../../Stores/StreamableCollectionStore";
    import SoundMeterWidgetWrapper from "../SoundMeterWidgetWrapper.svelte";
    import { JitsiTrackStreamWrapper } from "../../Streaming/Jitsi/JitsiTrackStreamWrapper";
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
    export let isHighlighted = false;
    export let peer: JitsiTrackStreamWrapper;

    const videoTrackStore: Readable<JitsiTrack | undefined> = peer.videoTrackStore;
    const audioTrackStore: Readable<JitsiTrack | undefined> = peer.audioTrackStore;

    let embedScreen: Streamable;
    let backGroundColor = "#000000";
    peer.jitsiTrackWrapper.spaceUser
        .then((spaceUser) => {
            backGroundColor = Color.getColorByString(spaceUser.name);
        })
        .catch(() => {
            console.error("Error getting spaceUser");
        });
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);

    if (peer) {
        embedScreen = peer as unknown as Streamable;
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
            if (videoTrack == undefined && isHighlighted) highlightedEmbedScreen.toggleHighlight(embedScreen);
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
        {#await peer.getExtendedSpaceUser()}
            <div />
        {:then spaceUser}
            <!-- TODO: implement on:close -->
            <ActionMediaBox
                {embedScreen}
                {spaceUser}
                videoEnabled={$videoTrackStore ? $videoTrackStore?.isActive() : false}
                on:close={() => {
                    /* TODO */
                }}
            />
        {/await}
    {/if}
    {#if $videoTrackStore}
        <div class="rounded-sm overflow-hidden flex justify-center flex-col w-full h-full">
            <JitsiVideoElement
                jitsiTrack={$videoTrackStore}
                isLocal={$videoTrackStore?.isLocal()}
                {isHighlighted}
                {isMobileFormat}
            />
        </div>
    {/if}
    {#if peer.target === "video/audio"}
        <div class={`absolute ${$videoTrackStore ? "top-0.5 right-2" : "top-1 right-3"}`}>
            {#if $audioTrackStore}
                <JitsiAudioElement jitsiTrack={$audioTrackStore} />
                <SoundMeterWidgetWrapper
                    cssClass="voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                    barColor={$videoTrackStore ? "blue" : "black"}
                    volume={peer.jitsiTrackWrapper.volumeStore}
                />
            {:else}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M1.375 2.375L21.625 22.625"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <path
                        d="M8.125 4.625C8.125 3.72989 8.48058 2.87145 9.11351 2.23851C9.74645 1.60558 10.6049 1.25 11.5 1.25C12.3951 1.25 13.2536 1.60558 13.8865 2.23851C14.5194 2.87145 14.875 3.72989 14.875 4.625V10.25C14.875 10.5832 14.8258 10.9145 14.7287 11.2332M12.4788 13.4832C11.9744 13.6361 11.4412 13.6687 10.922 13.5784C10.4028 13.4882 9.9119 13.2776 9.4887 12.9635C9.06549 12.6494 8.72171 12.2406 8.48491 11.7698C8.2481 11.299 8.12484 10.7793 8.125 10.2522V9.12725"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <path
                        d="M3.625 10.25C3.62475 11.6713 4.00915 13.0661 4.73742 14.2866C5.46568 15.5071 6.51068 16.5077 7.76159 17.1824C9.01249 17.8571 10.4227 18.1807 11.8426 18.1189C13.2625 18.0571 14.6392 17.6121 15.8267 16.8313M18.0767 14.5813C18.9248 13.2961 19.3756 11.78ƒbtn)97 19.3727 10.25"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <path
                        d="M7 22.625H16"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <path
                        d="M11.5 18.125V22.625"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            {/if}
        </div>
    {/if}
    {#await peer.jitsiTrackWrapper.spaceUser}
        <div />
    {:then spaceUser}
        {#if $embedScreenLayoutStore === LayoutMode.VideoChat && $videoTrackStore === undefined}
            <div
                id="tag"
                style="background-color: {backGroundColor}; color: {textColor};"
                class="flex flex-col justify-center items-center content-center !h-full w-full gap-2"
            >
                <Woka src={spaceUser.getWokaBase64} customHeight={`100px`} customWidth={`100px`} />
                <span class="font-semibold text-sm not-italic break-words px-2 overflow-y-auto max-h-10">
                    {peer.jitsiTrackWrapper.isLocal ? $LL.camera.my.nameTag() : spaceUser.name}
                </span>
            </div>
        {:else}
            <UserTag
                isMe={peer.jitsiTrackWrapper.isLocal}
                name={spaceUser.name}
                wokaSrc={spaceUser.getWokaBase64}
                minimal={!!$videoTrackStore}
            />
        {/if}
    {/await}
</div>

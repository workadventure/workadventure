<script lang="ts">
    import { Color } from "@workadventure/shared-utils";
    import { Readable } from "svelte/store";
    import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
    import { onMount } from "svelte";
    import microphoneOffImg from "../images/microphone-off.png";
    import { EmbedScreen, highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { Streamable } from "../../Stores/StreamableCollectionStore";
    import SoundMeterWidgetWrapper from "../SoundMeterWidgetWrapper.svelte";
    import { JitsiTrackStreamWrapper } from "../../Streaming/Jitsi/JitsiTrackStreamWrapper";
    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import UserTag from "./UserTag.svelte";
    import JitsiVideoElement from "./JitsiVideoElement.svelte";
    import JitsiAudioElement from "./JitsiAudioElement.svelte";

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

    onMount(() => {
        resizeObserver.observe(jitsiMediaBoxHtml);
    });
</script>

<div
    id="container"
    class="jitsi-video"
    bind:this={jitsiMediaBoxHtml}
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    {#if $videoTrackStore}
        <div class="tw-rounded-sm tw-overflow-hidden tw-flex tw-w-full tw-flex-col tw-h-full">
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
                    classcss="voice-meter-cam-off tw-relative tw-mr-0 tw-ml-auto tw-translate-x-0 tw-transition-transform"
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
            <UserTag
                isMe={peer.jitsiTrackWrapper.isLocal}
                name={peer.jitsiTrackWrapper.spaceUser?.name ?? ""}
                wokaSrc={wokaBase64}
                minimal={!!$videoTrackStore}
            />
        {/await}
    {/if}
</div>

<style lang="scss">
    /*    video.no-video {
        visibility: collapse;
    }*/
</style>

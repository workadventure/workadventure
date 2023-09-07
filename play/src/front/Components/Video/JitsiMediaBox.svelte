<script lang="ts">
    import { onMount } from "svelte";
    import { Color } from "@workadventure/shared-utils";
    import { Readable } from "svelte/store";
    import type JitsiTrack from "lib-jitsi-meet/types/hand-crafted/modules/RTC/JitsiTrack";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";

    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import microphoneOffImg from "../images/microphone-off.png";

    import { EmbedScreen, highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { Streamable } from "../../Stores/StreamableCollectionStore";
    import SoundMeterWidgetWrapper from "../SoundMeterWidgetWrapper.svelte";
    import { JitsiTrackStreamWrapper } from "../../Streaming/Jitsi/JitsiTrackStreamWrapper";
    import UserTag from "./UserTag.svelte";
    import JitsiVideoElement from "./JitsiVideoElement.svelte";
    import JitsiAudioElement from "./JitsiAudioElement.svelte";

    export let clickable = true;
    export let peer: JitsiTrackStreamWrapper;

    const videoTrackStore: Readable<JitsiTrack | undefined> = peer.videoTrackStore;
    const audioTrackStore: Readable<JitsiTrack | undefined> = peer.audioTrackStore;

    let embedScreen: EmbedScreen;
    let videoContainer: HTMLDivElement;
    //let minimized: boolean;
    let isMobile: boolean;

    let backGroundColor = Color.getColorByString(peer.jitsiTrackWrapper.spaceUser?.name ?? "");
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);

    if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }

    const resizeObserver = new ResizeObserver(() => {
        //minimized = isMediaBreakpointOnly("md");
        isMobile = isMediaBreakpointUp("md");
    });

    onMount(() => {
        resizeObserver.observe(videoContainer);
    });
</script>

<div
    id="container"
    class="jitsi-video"
    bind:this={videoContainer}
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    {#if $videoTrackStore}
        <div class="rounded-sm overflow-hidden flex w-full flex-col h-full">
            <JitsiVideoElement
                jitsiTrack={$videoTrackStore}
                isMobile={isMobile || $embedScreenLayoutStore === LayoutMode.VideoChat}
                isLocal={$videoTrackStore?.isLocal()}
            />
        </div>
    {/if}
    {#if peer.target === "video/audio"}
        <div class={`absolute ${$videoTrackStore ? "top-0.5 right-2" : "top-1 right-3"}`}>
            {#if $audioTrackStore}
                <JitsiAudioElement jitsiTrack={$audioTrackStore} />
                <SoundMeterWidgetWrapper
                    classcss="voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                    barColor={$videoTrackStore ? "blue" : "black"}
                    volume={peer.jitsiTrackWrapper.volumeStore}
                />
            {:else}
                <img
                    draggable="false"
                    src={microphoneOffImg}
                    class="flex p-1 h-8 w-8 voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                    alt="Mute"
                    class:brightness-0={textColor === "black" && !$videoTrackStore}
                    class:brightness-100={textColor === "white" && !$videoTrackStore}
                />
            {/if}
        </div>
    {/if}
    {#if peer.jitsiTrackWrapper.spaceUser}
        {#await peer.jitsiTrackWrapper.spaceUser?.getWokaBase64()}
            <div />
        {:then wokaBase64}
            <UserTag
                isMe={$audioTrackStore?.isLocal() || $videoTrackStore?.isLocal()}
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

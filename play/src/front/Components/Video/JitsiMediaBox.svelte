<script lang="ts">
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";

    import { afterUpdate, onDestroy, onMount } from "svelte";
    import { isMediaBreakpointOnly, isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { JitsiTrackWrapper } from "../../Streaming/Jitsi/JitsiTrackWrapper";
    import microphoneOffImg from "../images/microphone-off.png";

    import { Color } from "@workadventure/shared-utils";
    import UserTag from "./UserTag.svelte";
    import { EmbedScreen, highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { Streamable } from "../../Stores/StreamableCollectionStore";
    import SoundMeterWidgetWrapper from "../SoundMeterWidgetWrapper.svelte";

    export let clickable = false;
    export let peer: JitsiTrackWrapper;

    let videoTrackStore = peer.videoTrack;
    let audioTrackStore = peer.audioTrack;

    let embedScreen: EmbedScreen;
    let videoContainer: HTMLDivElement;
    let videoElement: HTMLVideoElement;
    let audioElement: HTMLAudioElement;
    let minimized: boolean;
    let isMobile: boolean;

    let backGroundColor = Color.getColorByString(peer.spaceUser?.name ?? "");
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);

    if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }

    const resizeObserver = new ResizeObserver(() => {
        minimized = isMediaBreakpointOnly("md");
        isMobile = isMediaBreakpointUp("md");
    });

    onMount(() => {
        resizeObserver.observe(videoContainer);
        // TODO: Fix this
        console.warn("PEER:", peer);
        attachTrack();
    });

    afterUpdate(() => {
        console.warn("PEER after Update:", { video: !!peer.videoTrack, audio: !!peer.audioTrack });
        attachTrack();
    });

    function attachTrack() {
        if (peer.audioTrack) {
            $audioTrackStore?.attach(audioElement);
        }
        if (peer.videoTrack) {
            $videoTrackStore?.attach(videoElement);
        }
    }

    onDestroy(() => {
        peer.unsubscribe();
    });
</script>

<div
    id="container"
    bind:this={videoContainer}
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    {#if $videoTrackStore}
        <div class="tw-flex tw-w-full tw-flex-col tw-h-full tw-rounded-sm tw-overflow-hidden">
            <video
                bind:this={videoElement}
                class:object-contain={isMobile || $embedScreenLayoutStore === LayoutMode.VideoChat}
                class="tw-h-full tw-max-w-full tw-rounded-sm"
                autoplay
                playsinline
            />
        </div>
    {/if}
    <div class={`tw-absolute ${peer.videoTrack ? "tw-top-0.5 tw-right-2" : "tw-top-1 tw-right-3"}`}>
        {#if $audioTrackStore}
            <audio autoplay muted={false} bind:this={audioElement} />
            <SoundMeterWidgetWrapper
                classcss="voice-meter-cam-off tw-relative tw-mr-0 tw-ml-auto tw-translate-x-0 tw-transition-transform"
                barColor="blue"
                volume={peer.volumeStore}
            />
        {:else}
            <img
                draggable="false"
                src={microphoneOffImg}
                class="tw-flex tw-p-1 tw-h-8 tw-w-8 voice-meter-cam-off tw-relative tw-mr-0 tw-ml-auto tw-translate-x-0 tw-transition-transform"
                alt="Mute"
                class:tw-brightness-0={textColor === "black" && !peer.videoTrack}
                class:tw-brightness-100={textColor === "white" && !peer.videoTrack}
            />
        {/if}
    </div>
    {#if peer.spaceUser}
        {#await peer.spaceUser?.getWokaBase64()}
            <div />
        {:then wokaBase64}
            <UserTag name={peer.spaceUser?.name ?? ""} wokaSrc={wokaBase64} minimal={!!peer.videoTrack} />
        {/await}
    {/if}
</div>

<style lang="scss">
    #container {
        @apply tw-h-fit tw-min-h-fit tw-flex tw-w-full tw-border-orange tw-border-2 tw-border-solid tw-relative tw-rounded;
        transition: all 0.2s ease;
    }
    video.no-video {
        visibility: collapse;
    }

    video {
        object-fit: cover;
        &.object-contain {
            object-fit: contain;
        }
    }
</style>

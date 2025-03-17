<script lang="ts">
    import { fly } from "svelte/transition";
    import { type Readable } from "svelte/store";
    import { onMount, onDestroy } from "svelte";
    import { PeerStatus, VideoPeer } from "../../WebRtc/VideoPeer";
    import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import type { ObtainedMediaStreamConstraints } from "../../WebRtc/P2PMessages/ConstraintMessage";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { JitsiTrackStreamWrapper } from "../../Streaming/Jitsi/JitsiTrackStreamWrapper";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import VideoMediaBox from "./VideoMediaBox.svelte";

    export let streamable: Streamable;
    export let isHighlighted = false;

    let constraintStore: Readable<ObtainedMediaStreamConstraints | null>;
    if (streamable instanceof VideoPeer) {
        constraintStore = streamable.constraintsStore;
    }
    let statusStore: Readable<PeerStatus> | null;
    if (streamable instanceof VideoPeer || streamable instanceof ScreenSharingPeer) {
        statusStore = streamable.statusStore;
    }

    const gameScene = gameManager.getCurrentGameScene();

    onMount(() => {
        gameScene.reposition();
    });

    onDestroy(() => {
        gameScene.reposition();
    });

    // Remove the highlight if the video is disabled
    $: {
        if (isHighlighted && $constraintStore && $constraintStore?.video === false) {
            highlightedEmbedScreen.removeHighlight();
        }
    }

    $: isHighlighted = $highlightedEmbedScreen === streamable;
    $: fullScreen = $highlightedEmbedScreen === streamable && $highlightFullScreen;
</script>

<!-- svelte-ignore missing-declaration -->
<!-- Bug with transition : transition:fly={{ y: 50, duration: 150 }} -->

{#if streamable instanceof VideoPeer}
    {#if $constraintStore || $statusStore === "error" || $statusStore === "connecting"}
        <div
            class="video-media-box pointer-events-auto media-container transition-all justify-center relative h-full w-full"
            in:fly={{ y: 50, duration: 150 }}
        >
            <VideoMediaBox peer={streamable} {isHighlighted} {fullScreen} />
        </div>
    {/if}
{:else if streamable instanceof ScreenSharingPeer}
    <div
        class="video-media-box pointer-events-auto media-container transition-all justify-center relative h-full w-full"
        in:fly={{ y: 50, duration: 150 }}
    >
        <VideoMediaBox peer={streamable} {isHighlighted} {fullScreen} />
    </div>
{:else if streamable instanceof JitsiTrackStreamWrapper}
    <div
        class="video-media-box pointer-events-auto media-container transition-all justify-center relative h-full w-full"
        in:fly={{ y: 50, duration: 150 }}
    >
        <VideoMediaBox peer={streamable} {isHighlighted} {fullScreen} />
    </div>
{:else}
    <div
        class="video-media-box pointer-events-auto media-container transition-all justify-center relative h-full w-full"
        in:fly={{ y: 50, duration: 150 }}
    >
        <VideoMediaBox peer={streamable} {isHighlighted} {fullScreen} />
    </div>
{/if}

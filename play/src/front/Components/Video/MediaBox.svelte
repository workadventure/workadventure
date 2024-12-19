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
    import { mediaStreamConstraintsStore } from "../../Stores/MediaStore";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import VideoMediaBox from "./VideoMediaBox.svelte";
    import LocalStreamMediaBox from "./LocalStreamMediaBox.svelte";
    import JitsiMediaBox from "./JitsiMediaBox.svelte";

    export let streamable: Streamable;
    export let isHighlighted = false;
    export let isClickable = false;

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

    $: videoEnabled = $constraintStore ? $constraintStore.video : false;
    $: isHighlighted = $highlightedEmbedScreen === streamable;
    $: fullScreen = $highlightedEmbedScreen === streamable && $highlightFullScreen;
</script>

<!-- svelte-ignore missing-declaration -->
<!-- Bug with tansition : transition:fly={{ y: 50, duration: 150 }} -->

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
        class="media-container media-box-shape-color pointer-events-auto screen-blocker pointer-event-auto"
        class:hightlighted={isHighlighted}
        class:mr-6={isHighlighted && streamable.getVideoTrack()}
        class:flex={!isHighlighted}
        class:media-box-camera-on-size={!isHighlighted && streamable.getVideoTrack()}
        class:media-box-camera-off-size={!isHighlighted && !streamable.getVideoTrack()}
        class:media-box-micropohone-off={!$mediaStreamConstraintsStore.audio}
        class:max-w-sm={isHighlighted && !streamable.getVideoTrack()}
        class:mx-auto={isHighlighted && !streamable.getVideoTrack()}
        class:m-auto={!isHighlighted && !streamable.getVideoTrack()}
        class:h-12={!isHighlighted && !streamable.getVideoTrack()}
        class:clickable={isClickable}
    >
        <div
            class="w-full flex screen-blocker"
            class:mr-6={isHighlighted}
            class:mx-auto={!isHighlighted}
            class:h-[32vw]={isHighlighted && videoEnabled}
        >
            <JitsiMediaBox peer={streamable} clickable={isClickable} {isHighlighted} />
        </div>
    </div>
{:else}
    <div class="media-container {isHighlighted ? 'hightlighted' : 'flex h-full'}" class:clickable={isClickable}>
        <!-- Here for the resize o-->
        <div class="{isHighlighted ? 'cam-share-receive' : 'mx-auto'} flex justify-center screen-blocker">
            <LocalStreamMediaBox peer={streamable} cssClass="" />
        </div>
    </div>
{/if}

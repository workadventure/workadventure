<svelte:options immutable={true} />

<script lang="ts">
    //import { fly } from "svelte/transition";
    import type { Readable } from "svelte/store";
    import { onMount, onDestroy } from "svelte";
    import { RemotePeer } from "../../WebRtc/RemotePeer";
    import type { VideoBox } from "../../Space/Space";
    import type { ObtainedMediaStreamConstraints } from "../../WebRtc/P2PMessages/ConstraintMessage";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import VideoMediaBox from "./VideoMediaBox.svelte";

    export let videoBox: VideoBox;
    export let isHighlighted = false;

    let constraintStore: Readable<ObtainedMediaStreamConstraints | null>;
    const streamable = videoBox.streamable;
    $: {
        if ($streamable instanceof RemotePeer) {
            constraintStore = $streamable.constraintsStore;
        }
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

    $: fullScreen = $highlightedEmbedScreen === videoBox && $highlightFullScreen;
</script>

<!-- Bug with transition : transition:fly={{ y: 50, duration: 150 }} -->

<div class="video-media-box pointer-events-auto media-container justify-center relative h-full w-full">
    <!-- in:fly={{ y: 50, duration: 150 }} -->
    <VideoMediaBox {videoBox} {fullScreen} />
</div>

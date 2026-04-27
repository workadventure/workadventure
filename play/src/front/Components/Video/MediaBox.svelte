<svelte:options immutable={true} />

<script lang="ts">
    //import { fly } from "svelte/transition";
    import { onMount, onDestroy, setContext } from "svelte";
    import type { VideoBox } from "../../Space/VideoBox";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import VideoMediaBox from "./VideoMediaBox.svelte";

    export let videoBox: VideoBox;
    export let fullScreen: boolean = false;

    // This context is used to know if the VideoMediaBox is part of the highlight fullscreen participant list.
    export let inHighlightFullscreenParticipantList: boolean = false;
    setContext("inHighlightFullscreenParticipantList", inHighlightFullscreenParticipantList);

    const gameScene = gameManager.getCurrentGameScene();

    onMount(() => {
        gameScene.reposition();
    });

    onDestroy(() => {
        gameScene.reposition();
    });
</script>

<!-- Bug with transition : transition:fly={{ y: 50, duration: 150 }} -->

<div
    class="video-media-box pointer-events-auto media-container justify-center relative h-full w-full"
    data-testid={`camera-box-${videoBox.spaceUser.name}`}
>
    <!-- in:fly={{ y: 50, duration: 150 }} -->
    <VideoMediaBox {videoBox} {fullScreen} />
</div>

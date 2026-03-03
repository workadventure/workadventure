<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { videoStreamElementsStore } from "../../Stores/PeerStore";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import LiveSubtitlesOverlayForSpace from "./LiveSubtitlesOverlayForSpace.svelte";

    const gameScene = gameManager.getCurrentGameScene();
    const spaces = gameScene.spaceRegistry.spaces;

    $: isActionBarHiddenInFullscreen = $highlightFullScreen && $videoStreamElementsStore.length > 0;
</script>

<div
    class="pointer-events-none absolute start-3 z-[300] flex max-w-[min(42rem,calc(100%-1.5rem))] flex-col gap-3 mobile:start-2 mobile:max-w-[calc(100%-1rem)] mobile:gap-2
    {isActionBarHiddenInFullscreen ? 'bottom-3 mobile:bottom-2' : 'bottom-[5.5rem] mobile:bottom-[6.5rem]'}"
    data-testid="live-subtitles-overlay"
>
    {#each [...$spaces.values()] as space (space.getName())}
        <LiveSubtitlesOverlayForSpace
            transcriptionStateStore={space.spacePeerManager.getLiveKitTranscriptionStateStore()}
        />
    {/each}
</div>

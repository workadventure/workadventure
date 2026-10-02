<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import type { PictureStore } from "../../Stores/PictureStore";

    interface Props {
        userId: number;
        placeholderSrc: string;
        width: string;
        height: string;
    }

    let { userId, placeholderSrc, width = "62px", height = "62px" }: Props = $props();

    const gameScene = gameManager.getCurrentGameScene();
    let companionSrc: string | undefined = $state();
    let src = $derived(companionSrc ?? placeholderSrc);

    $effect(() => {
        const companionWokaPictureStore: PictureStore | undefined =
            userId === -1
                ? gameScene.CurrentPlayer.companion?.pictureStore
                : gameScene.MapPlayersByKey.getNestedStore(userId, (item) => item.companion?.pictureStore);

        companionSrc = undefined;
        return companionWokaPictureStore?.subscribe((source) => {
            companionSrc = source;
        });
    });
</script>

<img {src} alt="" draggable="false" style="--theme-width: {width}; --theme-height: {height}" />

<style>
    img {
        display: inline-block;
        pointer-events: auto;
        width: var(--theme-width);
        height: var(--theme-height);
        margin: 0;
        padding: 0;
        position: static;
        left: 0;
        bottom: 0;
        right: 0;
        top: 0;
        image-rendering: pixelated;
    }
</style>

<script lang="typescript">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import type { PictureStore } from "../../Stores/PictureStore";

    export let userId: number;
    export let placeholderSrc: string;
    export let width: string = "62px";
    export let height: string = "62px";

    const gameScene = gameManager.getCurrentGameScene();
    let companionWokaPictureStore: PictureStore | undefined;
    if (userId === -1) {
        companionWokaPictureStore = gameScene.CurrentPlayer.companion?.pictureStore;
    } else {
        companionWokaPictureStore = gameScene.MapPlayersByKey.getNestedStore(
            userId,
            (item) => item.companion?.pictureStore
        );
    }
</script>

<img
    src={$companionWokaPictureStore ?? placeholderSrc}
    alt=""
    class="nes-pointer"
    style="--theme-width: {width}; --theme-height: {height}"
/>

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

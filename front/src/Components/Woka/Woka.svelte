<script lang="typescript">
    import { onDestroy } from "svelte";

    import { gameManager } from "../../Phaser/Game/GameManager";

    export let userId: number;
    export let placeholderSrc: string;
    export let width: string = "62px";
    export let height: string = "62px";

    const gameScene = gameManager.getCurrentGameScene();
    const playerWokaPictureStore = gameScene.getUserWokaPictureStore(userId);

    let src = placeholderSrc;
    const unsubscribe = playerWokaPictureStore.picture.subscribe((source) => {
        src = source ?? placeholderSrc;
    });

    onDestroy(unsubscribe);
</script>

<img {src} alt="" class="nes-pointer" style="--theme-width: {width}; --theme-height: {height}" />

<style>
    img {
        display: inline-block;
        pointer-events: auto;
        width: var(--theme-width);
        height: var(--theme-height);
        margin: 0;
        padding: 0;
        image-rendering: pixelated;
    }
</style>

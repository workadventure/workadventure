<script lang="ts">
    import { onDestroy } from "svelte";

    import { gameManager } from "../../Phaser/Game/GameManager";

    export let userId: number;
    export let placeholderSrc: string;
    export let customWidth: string;
    export let customHeight: string;
    let width = "62px";
    let height = "62px";

    const gameScene = gameManager.getCurrentGameScene();
    let playerWokaPictureStore;
    if (userId === -1) {
        playerWokaPictureStore = gameScene.CurrentPlayer.pictureStore;
    } else {
        playerWokaPictureStore = gameScene.MapPlayersByKey.getNestedStore(userId, (item) => item.pictureStore);
    }

    let src = placeholderSrc;

    const unsubscribe = playerWokaPictureStore.subscribe((source) => {
        src = source ?? placeholderSrc;
    });

    function noDrag() {
        return false;
    }

    onDestroy(unsubscribe);
</script>

<img
    {src}
    alt=""
    class="nes-pointer noselect"
    style="--theme-width: {customWidth ?? width}; --theme-height: {customHeight ?? height} image-rendering: pixalated"
    draggable="false"
    on:dragstart|preventDefault={noDrag}
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

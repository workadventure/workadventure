<script lang="typescript">
import { onDestroy } from 'svelte';

    import { gameManager } from '../../Phaser/Game/GameManager';
    import logoWA from "../images/logo-WA-pixel.png"; // placeholder

    export let userId: number;

    const gameScene = gameManager.getCurrentGameScene();
    const playerWokaPictureStore = gameScene.getUserWokaPictureStore(userId);

    let src = logoWA;
    const unsubscribe = playerWokaPictureStore.picture.subscribe((htmlElement) => {
        src = htmlElement?.src ?? logoWA;
    });

    onDestroy(unsubscribe);
</script>

<img src={src} alt="woka" class="nes-pointer">

<style>
    img {
        display: block;
        pointer-events: auto;
        width: 60px;
        height: 60px;
        left: calc(50% - 30px);
        top: calc(50% - 30px);
        margin: 0;
        padding: 0;
        image-rendering: pixelated;
    }
</style>
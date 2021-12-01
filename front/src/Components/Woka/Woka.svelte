<script lang="typescript">
import { onDestroy } from 'svelte';

    import { gameManager } from '../../Phaser/Game/GameManager';

    export let userId: number;
    export let placeholderSrc: string;

    const gameScene = gameManager.getCurrentGameScene();
    const playerWokaPictureStore = gameScene.getUserWokaPictureStore(userId);

    let src = placeholderSrc;
    const unsubscribe = playerWokaPictureStore.picture.subscribe((htmlElement) => {
        src = htmlElement?.src ?? placeholderSrc;
    });

    onDestroy(unsubscribe);
</script>

<img src={src} alt="" class="nes-pointer">

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
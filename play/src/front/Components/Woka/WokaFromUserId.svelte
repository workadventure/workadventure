<script lang="ts">
    import { onDestroy } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import Woka from "./Woka.svelte";

    export let userId: number;
    export let placeholderSrc: string;
    export let customWidth: string;
    export let customHeight: string;

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

    onDestroy(unsubscribe);
</script>

<Woka {src} {customWidth} {customHeight} />

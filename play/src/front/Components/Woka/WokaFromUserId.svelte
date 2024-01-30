<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import Woka from "./Woka.svelte";

    export let userId: number;
    export let placeholderSrc: string;
    export let customWidth: string;
    export let customHeight: string;

    let src: string;
    let unsubscribe: Unsubscriber;

    onMount(() => {
        const gameScene = gameManager.getCurrentGameScene();
        let playerWokaPictureStore;
        if (userId === -1) {
            playerWokaPictureStore = gameScene.CurrentPlayer.pictureStore;
        } else {
            playerWokaPictureStore = gameScene.MapPlayersByKey.getNestedStore(userId, (item) => item.pictureStore);
        }
        src = placeholderSrc;
        unsubscribe = playerWokaPictureStore.subscribe((source) => {
            src = source ?? placeholderSrc;
        });
    });
    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });
</script>

{#if src}
    <Woka {src} {customWidth} {customHeight} />
{/if}

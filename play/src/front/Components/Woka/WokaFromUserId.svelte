<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import Woka from "./Woka.svelte";

    export let userId: number | string;
    export let placeholderSrc: string;
    export let customWidth: string;

    let src: string;
    let unsubscribe: Unsubscriber | undefined;

    onMount(() => {
        const gameScene = gameManager.getCurrentGameScene();
        let playerWokaPictureStore;
        if (userId === -1) {
            playerWokaPictureStore = gameScene.CurrentPlayer.pictureStore;
        } else if (Number.isInteger(userId)) {
            playerWokaPictureStore = gameScene.MapPlayersByKey.getNestedStore(
                userId as number,
                (item) => item.pictureStore
            );
        } else {
            // eslint-disable-next-line svelte/require-store-reactive-access
            playerWokaPictureStore = [...gameScene.MapPlayersByKey].find(
                ([, player]) => player.userUuid === (userId as string)
            )?.[1].pictureStore;
        }

        src = placeholderSrc;
        unsubscribe = playerWokaPictureStore?.subscribe((source) => {
            src = source ?? placeholderSrc;
        });
    });
    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });
</script>

{#if src}
    <Woka {src} {customWidth} />
{/if}

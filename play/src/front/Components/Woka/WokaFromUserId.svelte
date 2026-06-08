<script lang="ts">
    import { onDestroy } from "svelte";
    import type { Unsubscriber } from "svelte/store";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import Woka from "./Woka.svelte";

    interface Props {
        userId: number | string;
        placeholderSrc: string;
        customWidth: string;
    }

    let { userId, placeholderSrc, customWidth }: Props = $props();

    let src: string | undefined = $state();
    let unsubscribe: Unsubscriber | undefined;

    function subscribeToPlayerPictureStore(currentUserId: number | string, currentPlaceholderSrc: string) {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = undefined;
        }

        const gameScene = gameManager.getCurrentGameScene();
        let playerWokaPictureStore;
        if (currentUserId === -1) {
            playerWokaPictureStore = gameScene.CurrentPlayer.pictureStore;
        } else if (Number.isInteger(currentUserId)) {
            playerWokaPictureStore = gameScene.MapPlayersByKey.getNestedStore(
                currentUserId as number,
                (item) => item.pictureStore,
            );
        } else {
            // eslint-disable-next-line svelte/require-store-reactive-access
            playerWokaPictureStore = [...gameScene.MapPlayersByKey].find(
                ([, player]) => player.userUuid === (currentUserId as string),
            )?.[1].pictureStore;
        }

        src = currentPlaceholderSrc;
        unsubscribe = playerWokaPictureStore?.subscribe((source) => {
            src = source ?? currentPlaceholderSrc;
        });
    }

    $effect(() => {
        subscribeToPlayerPictureStore(userId, placeholderSrc);
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });
</script>

{#if src}
    <Woka {src} {customWidth} />
{/if}

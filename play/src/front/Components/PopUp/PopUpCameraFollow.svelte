<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { get } from "svelte/store";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { WOKA_SPEED } from "../../Enum/EnvironmentVariable";
    import PopUpContainer from "./PopUpContainer.svelte";

    export let targetUuid: string;

    function getPlayerName(): string {
        const gameScene = gameManager.getCurrentGameScene();
        const playersMap = get(gameScene.MapPlayersByKey);
        for (const [, player] of playersMap) {
            if (player.userUuid === targetUuid) {
                return player.playerName;
            }
        }
        return "";
    }

    function walkToUser() {
        const gameScene = gameManager.getCurrentGameScene();
        const playersMap = get(gameScene.MapPlayersByKey);
        for (const [, player] of playersMap) {
            if (player.userUuid === targetUuid) {
                gameScene.moveTo({ x: player.x, y: player.y }, true, (WOKA_SPEED ?? 9) * 2.5).catch((error) => {
                    console.warn("Error while moving to player", error);
                });
                stopFollowing();
                break;
            }
        }
    }

    function stopFollowing() {
        const gameScene = gameManager.getCurrentGameScene();
        gameScene.getCameraManager().stopFollowRemotePlayer();
        closeBanner();
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            stopFollowing();
        }
    }

    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    function closeBanner() {
        dispatch("close");
    }
</script>

<svelte:window on:keydown={onKeyDown} />

<PopUpContainer reduceOnSmallScreen={true}>
    <div class="text-center text-white pointer-events-auto">
        <div class="text-lg bold flex gap-4 place-content-center mb-2">
            {$LL.follow.cameraFollow.following({ playerName: getPlayerName() })}
        </div>
    </div>

    <svelte:fragment slot="buttons">
        <button type="button" class="btn btn-secondary w-1/2 justify-center" on:click|preventDefault={walkToUser}>
            {$LL.follow.cameraFollow.walkToUser()}
        </button>
        <button
            type="button"
            class="btn btn-light btn-ghost w-1/2 justify-center whitespace-nowrap"
            on:click|preventDefault={stopFollowing}
        >
            {$LL.follow.cameraFollow.stopFollowing()}
        </button>
    </svelte:fragment>
</PopUpContainer>

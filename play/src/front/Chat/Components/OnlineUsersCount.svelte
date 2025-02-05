<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    export let searchActive = false;
    const gameScene = gameManager.getCurrentGameScene();
    const userWorldCount = gameScene.worldUserCounter;
</script>

<div class="tw-flex tw-items-center tw-justify-center tw-text-success tw-space-x-1.5 {searchActive ? 'tw-hidden' : ''}">
    <div
        class="tw-text-xs tw-aspect-square tw-min-w-5 tw-h-5 tw-px-1 tw-border tw-border-solid tw-border-success tw-flex tw-items-center tw-justify-center tw-font-bold tw-rounded"
    >
        {$userWorldCount}
    </div>
    <div class="tw-text-xs tw-font-bold">{$LL.chat.onlineUsers()}</div>
</div>

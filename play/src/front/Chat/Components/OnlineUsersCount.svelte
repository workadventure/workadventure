<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    export let searchActive = false;
    const gameScene = gameManager.getCurrentGameScene();
    const userWorldCount = gameScene.worldUserCounter;
</script>

<div class="flex items-center justify-center gap-1 text-success space-x-1.5 {searchActive ? 'hidden' : ''}">
    <div
        class="text-xs aspect-square min-w-5 h-5 px-1 border border-solid border-success flex items-center justify-center font-bold rounded"
    >
        {$userWorldCount}
    </div>
    <div class="text-xs font-bold">{$LL.chat.onlineUsers()}</div>
</div>

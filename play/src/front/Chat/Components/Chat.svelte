<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { navChat } from "../Stores/ChatStore";
    import { INITIAL_SIDEBAR_WIDTH } from "../../Stores/ChatStore";
    import RoomUserList from "./UserList/RoomUserList.svelte";
    import RoomList from "./RoomList.svelte";
    export let sideBarWidth: number = INITIAL_SIDEBAR_WIDTH;

    const gameScene = gameManager.getCurrentGameScene();
    const userProviderMergerPromise = gameScene.userProviderMerger;
</script>

<div class="flex flex-col h-full">
    <div id="chatModal" class="absolute to-50%" />
    <div class="flex flex-col gap-2 !flex-1 min-h-0">
        {#if $navChat.key === "users"}
            {#await userProviderMergerPromise}
                <div />
            {:then userProviderMerger}
                <RoomUserList {userProviderMerger} />
            {/await}
        {:else if $navChat.key === "externalModule"}
            <svelte:component this={$navChat.component} {...$$restProps} {...$navChat.props} />
        {:else}
            <RoomList {sideBarWidth} />
        {/if}
    </div>
</div>

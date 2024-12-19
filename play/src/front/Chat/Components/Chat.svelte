<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { navChat } from "../Stores/ChatStore";
    import { INITIAL_SIDEBAR_WIDTH } from "../../Stores/ChatStore";
    import RoomUserList from "./UserList/RoomUserList.svelte";
    import RoomList from "./RoomList.svelte";
    import ChatSettings from "./ChatSettings.svelte";

    export let sideBarWidth: number = INITIAL_SIDEBAR_WIDTH;

    const gameScene = gameManager.getCurrentGameScene();
    const userProviderMergerPromise = gameScene.userProviderMerger;
</script>

<div class="tw-flex tw-flex-col tw-h-full">
    <div id="chatModal" class="tw-absolute tw-to-50%" />
    <div class="tw-flex tw-flex-col tw-gap-2 !tw-flex-1 tw-min-h-0">
        {#if $navChat === "users"}
            {#await userProviderMergerPromise}
                <div />
            {:then userProviderMerger}
                <RoomUserList {userProviderMerger} />
            {/await}
        {:else if $navChat === "settings"}
            <ChatSettings />
        {:else}
            <RoomList {sideBarWidth} />
        {/if}
    </div>
</div>

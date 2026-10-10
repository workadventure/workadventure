<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { navChat } from "../Stores/ChatStore";
    import { INITIAL_SIDEBAR_WIDTH } from "../../Stores/ChatStore";
    import LL from "../../../i18n/i18n-svelte";
    import RoomUserList from "./UserList/RoomUserList.svelte";
    import RoomList from "./RoomList.svelte";
    import ChatLoader from "./ChatLoader.svelte";

    interface Props {
        sideBarWidth: number;
        [key: string]: unknown;
    }

    let { sideBarWidth = INITIAL_SIDEBAR_WIDTH, ...rest }: Props = $props();

    const gameScene = gameManager.getCurrentGameScene();
    const userProviderMergerPromise = gameScene.userProviderMerger;
    // The map does not wait for the chat: until the connection exists (for a logged-in user, until the Matrix code
    // is downloaded), no tab can be shown, as the room list and the header of the user list read it right away.
    const chatConnectionStore = gameManager.chatConnectionStore;
</script>

<div class="flex flex-col h-full">
    <div id="chatModal" class="absolute to-50%"></div>
    <div class="flex flex-col gap-2 !flex-1 min-h-0">
        {#if !$chatConnectionStore}
            <ChatLoader label={$LL.chat.connecting()} />
        {:else if $navChat.key === "users"}
            {#await userProviderMergerPromise}
                <div></div>
            {:then userProviderMerger}
                <RoomUserList {userProviderMerger} />
            {/await}
        {:else if $navChat.key === "externalModule"}
            {@const NavChat = $navChat.component}
            <NavChat {...rest} {...$navChat.props} />
        {:else}
            <RoomList {sideBarWidth} />
        {/if}
    </div>
</div>

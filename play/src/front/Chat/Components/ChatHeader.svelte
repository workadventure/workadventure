<script lang="ts">
    import { chatInputFocusStore } from "../../Stores/ChatStore";

    let searchActive = false;
    import { chatSearchBarValue, navChat, joignableRoom } from "../Stores/ChatStore";
    import LoadingSmall from "../images/loading-small.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { UserProviderMerger } from "../UserProviderMerger/UserProviderMerger";
    import OnlineUsersCount from "./OnlineUsersCount.svelte";
    import { IconMessageCircle2, IconSearch, IconUsers, IconX } from "@wa-icons";

    const gameScene = gameManager.getCurrentGameScene();
    const chat = gameManager.chatConnection;
    const showChatButton = gameScene.room.isChatEnabled;
    const showUserListButton = gameScene.room.isChatOnlineListEnabled;
    const showNavBar = gameScene.room.isChatOnlineListEnabled || gameScene.room.isChatDisconnectedListEnabled;
    const userProviderMergerPromise = gameScene.userProviderMerger;
    let searchLoader = false;
    const chatStatusStore = chat.connectionStatus;
    let typingTimer: ReturnType<typeof setTimeout>;
    const DONE_TYPING_INTERVAL = 2000;

    let searchValue = "";

    const handleKeyDown = () => {
        if (searchValue === "") joignableRoom.set([]);
        clearTimeout(typingTimer);
    };

    const handleKeyUp = (userProviderMerger: UserProviderMerger) => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            searchLoader = true;
            if ($navChat.key === "chat" && $chatSearchBarValue.trim() !== "") {
                searchAccessibleRooms();
            }

            userProviderMerger
                .setFilter($chatSearchBarValue)
                .catch((e) => console.error(e))
                .finally(() => {
                    searchLoader = false;
                });
        }, DONE_TYPING_INTERVAL);
    };

    const searchAccessibleRooms = () => {
        chat.searchAccessibleRooms($chatSearchBarValue)
            .then((chatRooms: { id: string; name: string | undefined }[]) => {
                joignableRoom.set(chatRooms);
            })
            .catch((e) => console.error(e))
            .finally(() => {
                searchLoader = false;
            });
        return;
    };

    function focusChatInput() {
        // Disable input manager to prevent the game from receiving the input
        chatInputFocusStore.set(true);
    }
    function unfocusChatInput() {
        // Enable input manager to allow the game to receive the input
        chatInputFocusStore.set(false);
    }
</script>

<div class="p-2 flex items-center absolute w-full z-40">
    <div class={searchActive ? "hidden" : ""}>
        {#if showNavBar}
            {#if $navChat.key === "chat" && showUserListButton}
                <button
                    class="userList p-3 hover:bg-white/10 rounded aspect-square w-12 h-12 !text-white"
                    on:click={() => navChat.switchToUserList()}
                >
                    <IconUsers font-size="20" />
                </button>
            {:else if showChatButton}
                <button
                    class="p-3 hover:bg-white/10 rounded aspect-square w-12 h-12 !text-white"
                    on:click={() => navChat.switchToChat()}
                >
                    <IconMessageCircle2 font-size="20" />
                </button>
            {/if}
        {/if}
    </div>
    <div class="flex flex-col items-center justify-center grow">
        <div class="text-md font-bold h-5 {searchActive ? 'hidden' : ''}">
            {#if $navChat.key === "chat"}
                {$LL.chat.chat()}
            {:else}
                {$LL.chat.users()}
            {/if}
        </div>
        {#if gameScene.room.isChatOnlineListEnabled}
            <OnlineUsersCount {searchActive} />
        {/if}
    </div>
    <div class="">
        {#if $chatStatusStore !== "OFFLINE"}
            <button
                class="p-3 hover:bg-white/10 rounded aspect-square w-12 h-12 relative z-50"
                on:click={() => (searchActive = !searchActive)}
            >
                {#if searchLoader}
                    <LoadingSmall />
                {/if}
                {#if !searchActive}
                    <IconSearch font-size="20" />
                {:else}
                    <IconX font-size="20" />
                {/if}
            </button>
        {:else}
            <div class="w-12" />
        {/if}
        <!-- searchbar -->
        {#if searchActive && $chatStatusStore !== "OFFLINE"}
            {#await userProviderMergerPromise}
                <div />
            {:then userProviderMerger}
                <div class="absolute w-full h-full z-40 right-0 top-0 bg-contrast/30">
                    <input
                        autocomplete="new-password"
                        class="wa-searchbar block text-white placeholder:text-white/50 w-full placeholder:text-sm border-none pl-6 pr-20 bg-transparent py-3 text-base h-full"
                        placeholder={$navChat.key === "users" ? $LL.chat.searchUser() : $LL.chat.searchChat()}
                        on:keydown={handleKeyDown}
                        on:keyup={() => handleKeyUp(userProviderMerger)}
                        bind:value={$chatSearchBarValue}
                        on:focusin={focusChatInput}
                        on:focusout={unfocusChatInput}
                    />
                </div>
            {/await}
        {/if}
    </div>
</div>

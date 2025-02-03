<script lang="ts">
    import { chatInputFocusStore, allowedDiscordBridgeStore } from "../../Stores/ChatStore";

    let searchActive = false;
    import { chatSearchBarValue, navChat, joignableRoom } from "../Stores/ChatStore";
    import {
        ENABLE_CHAT,
        ENABLE_CHAT_DISCONNECTED_LIST,
        ENABLE_CHAT_ONLINE_LIST,
    } from "../../Enum/EnvironmentVariable";
    import LoadingSmall from "../images/loading-small.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { UserProviderMerger } from "../UserProviderMerger/UserProviderMerger";
    import discordLogo from "../../Components/images/discord-logo.svg";
    import { externalChatSettingsSvelteComponent } from "../../Stores/Utils/externalSvelteComponentStore";
    import { IconMessageCircle2, IconSearch, IconUsers, IconX } from "@wa-icons";

    const gameScene = gameManager.getCurrentGameScene();
    const chat = gameManager.chatConnection;
    const showNavBar = (ENABLE_CHAT_ONLINE_LIST || ENABLE_CHAT_DISCONNECTED_LIST) && ENABLE_CHAT;
    const userProviderMergerPromise = gameScene.userProviderMerger;
    let userWorldCount = gameScene.worldUserCounter;
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
            if ($navChat === "chat" && $chatSearchBarValue.trim() !== "") {
                searchAccessibleRooms();
            }

            userProviderMerger.setFilter($chatSearchBarValue).finally(() => {
                searchLoader = false;
            });
        }, DONE_TYPING_INTERVAL);
    };

    const searchAccessibleRooms = () => {
        chat.searchAccessibleRooms($chatSearchBarValue)
            .then((chatRooms: { id: string; name: string | undefined }[]) => {
                joignableRoom.set(chatRooms);
            })
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

<div class="tw-p-2 tw-items-center tw-flex tw-flex-row tw-absolute tw-w-full tw-z-40">
    <div class="tw-flex flex-row {searchActive ? 'tw-hidden' : ''}">
        {#if showNavBar}
            {#if $externalChatSettingsSvelteComponent.size > 0}
                {#each [...$externalChatSettingsSvelteComponent.entries()] as [id, value] (`externalChatSettingsSvelteComponent-${id}`)}
                    <svelte:component this={value.componentType} extensionModule={value.extensionModule} />
                {/each}
            {/if}

            {#if $allowedDiscordBridgeStore}
                <button
                    class="tw-flex tw-justify-center tw-items-center tw-p-2 tw-rounded-md tw-cursor-pointer {$navChat ===
                    'settings'
                        ? 'tw-bg-secondary-800 tw-text-black'
                        : 'hover:tw-bg-white hover:tw-bg-opacity-10'}"
                    on:click={() => navChat.switchToSettings()}
                >
                    <img src={discordLogo} alt="Discord logo" class="tw-w-6" />
                </button>
            {/if}

            {#if $navChat === "chat"}
                <button
                    class="userList tw-p-3 hover:tw-bg-white/10 tw-rounded-xl tw-aspect-square tw-w-12"
                    on:click={() => navChat.switchToUserList()}
                >
                    <IconUsers font-size="20" />
                </button>
            {:else}
                <button
                    class="tw-p-3 hover:tw-bg-white/10 tw-rounded-2xl tw-aspect-square tw-w-12"
                    on:click={() => navChat.switchToChat()}
                >
                    <IconMessageCircle2 font-size="20" />
                </button>
            {/if}
        {/if}
    </div>
    <div class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-grow">
        <div class="tw-text-md tw-font-bold tw-h-5 {searchActive ? 'tw-hidden' : ''}">
            {#if $navChat === "chat"}
                {$LL.chat.chat()}
            {:else}
                {$LL.chat.users()}
            {/if}
        </div>
        <div
            class="tw-flex tw-items-center tw-justify-center tw-text-success tw-space-x-1.5 {searchActive
                ? 'tw-hidden'
                : ''}"
        >
            <div
                class="tw-text-xs tw-aspect-square tw-min-w-5 tw-h-5 tw-px-1 tw-border tw-border-solid tw-border-success tw-flex tw-items-center tw-justify-center tw-font-bold tw-rounded"
            >
                {$userWorldCount}
            </div>
            <div class="tw-text-xs tw-font-bold">{$LL.chat.onlineUsers()}</div>
        </div>
    </div>
    <div class="">
        {#if $chatStatusStore !== "OFFLINE"}
            <button
                class="tw-p-3 hover:tw-bg-white/10 tw-rounded-xl tw-aspect-square tw-w-12 tw-relative tw-z-50"
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
            <div class="tw-w-12" />
        {/if}
        <!-- searchbar -->
        {#if searchActive && $chatStatusStore !== "OFFLINE"}
            {#await userProviderMergerPromise}
                <div />
            {:then userProviderMerger}
                <div class="tw-absolute tw-w-full tw-h-full tw-z-40 tw-right-0 tw-top-0 tw-bg-contrast/30">
                    <input
                        autocomplete="new-password"
                        class="wa-searchbar tw-block tw-text-white placeholder:tw-text-white/50 tw-w-full placeholder:tw-text-sm tw-border-none tw-pl-6 tw-pr-20 tw-bg-transparent tw-py-3 tw-text-base tw-h-full"
                        placeholder={$navChat === "users" ? $LL.chat.searchUser() : $LL.chat.searchChat()}
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

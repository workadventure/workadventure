<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue, joignableRoom, navChat } from "../Stores/ChatStore";
    import { INITIAL_SIDEBAR_WIDTH } from "../../Stores/ChatStore";
    import { UserProviderMerger } from "../UserProviderMerger/UserProviderMerger";
    import RoomUserList from "./UserList/RoomUserList.svelte";
    import ChatLoader from "./ChatLoader.svelte";
    import RoomList from "./RoomList.svelte";
    import { IconShieldLock } from "@wa-icons";

    export let sideBarWidth: number = INITIAL_SIDEBAR_WIDTH;

    const gameScene = gameManager.getCurrentGameScene();
    const currentRoom = gameScene.room;

    const showNavBar =
        (currentRoom.isChatOnlineListEnabled || currentRoom.isChatDisconnectedListEnabled) && currentRoom.isChatEnabled;

    const chat = gameManager.chatConnection;
    const userProviderMergerPromise = gameScene.userProviderMerger;
    const DONE_TYPING_INTERVAL = 2000;

    let searchValue = "";
    let typingTimer: ReturnType<typeof setTimeout>;
    let searchLoader = false;

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

    const handleKeyDown = () => {
        if (searchValue === "") joignableRoom.set([]);
        clearTimeout(typingTimer);
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

    async function initChatConnectionEncryption() {
        try {
            await chat.initEndToEndEncryption();
        } catch (error) {
            console.error("Failed to initChatConnectionEncryption", error);
        }
    }

    const chatStatusStore = chat.connectionStatus;
    $: isEncryptionRequiredAndNotSet = chat.isEncryptionRequiredAndNotSet;
    $: isGuest = chat.isGuest;
</script>

<div class="tw-flex tw-flex-col tw-gap-2 tw-h-full ">
    <div id="chatModal" class="tw-absolute tw-to-50%" />
    <div class="tw-flex tw-flex-col tw-gap-2">
        {#if showNavBar}
            <nav class="nav">
                <div class="background" class:chat={$navChat === "chat"} />
                <ul>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <li class:active={$navChat === "users"} on:click={() => navChat.switchToUserList()}>
                        {$LL.chat.users()}
                    </li>

                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <li class:active={$navChat === "chat"} on:click={() => navChat.switchToChat()}>
                        {$LL.chat.chat()}
                    </li>
                </ul>
            </nav>
        {/if}
        <!-- searchbar -->
        {#await userProviderMergerPromise}
            <div />
        {:then userProviderMerger}
            {#if $chatStatusStore !== "OFFLINE"}
                <div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid">
                    <div class="{showNavBar ? 'tw-p-3' : 'tw-pb-3 tw-pr-10'} ">
                        <input
                            class="wa-searchbar tw-block tw-text-white tw-w-full placeholder:tw-text-sm tw-rounded-3xl tw-px-3 tw-py-1 tw-border-light-purple tw-border tw-border-solid tw-bg-transparent"
                            placeholder={$navChat === "users" ? $LL.chat.searchUser() : $LL.chat.searchChat()}
                            on:keydown={handleKeyDown}
                            on:keyup={() => handleKeyUp(userProviderMerger)}
                            bind:value={$chatSearchBarValue}
                        />
                    </div>
                </div>
            {/if}
        {/await}
    </div>
    <div class="tw-flex tw-flex-col tw-gap-2 !tw-flex-1 tw-min-h-0">
        {#if $isEncryptionRequiredAndNotSet === true && $isGuest === false}
            <button
                data-testid="restoreEncryptionButton"
                on:click|stopPropagation={initChatConnectionEncryption}
                class="tw-text-red-500 tw-flex tw-gap-1 tw-border tw-border-solid tw-border-red-500 tw-rounded-md tw-justify-center !tw-flex-shrink !tw-flex-grow-0 !tw-basis-auto"
            >
                <IconShieldLock /> {$LL.chat.e2ee.encryptionNotConfigured()}</button
            >
        {/if}
        {#if $navChat === "users"}
            {#await userProviderMergerPromise}
                <div />
            {:then userProviderMerger}
                <RoomUserList {userProviderMerger} />
            {/await}
        {:else}
            <RoomList {sideBarWidth} />
        {/if}
        {#if searchLoader}
            <ChatLoader label={$LL.chat.loader()} />
        {/if}
    </div>
</div>

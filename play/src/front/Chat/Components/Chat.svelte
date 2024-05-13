<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue, joignableRoom, navChat } from "../Stores/ChatStore";
    import RoomUserList from "./UserList/RoomUserList.svelte";
    import RoomList from "./RoomList.svelte";
    import ChatLoader from "./ChatLoader.svelte";
    import { CONNECTED_USER_FILTER_NAME, WORLD_SPACE_NAME } from "../../Space/Space";
    import { LocalSpaceProviderSingleton } from "../../Space/SpaceProvider/SpaceStore";

    const chat = gameManager.getCurrentGameScene().chatConnection;
    const DONE_TYPING_INTERVAL = 2000;
    $: chatConnectionStatus = chat.connectionStatus;

    let searchValue = "";
    let typingTimer: NodeJS.Timeout;
    let searchLoader: boolean = false;

    const handleKeyUp = () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            searchLoader = true;
            if ($navChat === "chat") {
                searchAccesibleRooms();
            }

            setConnectedUsersFilter();

            chat.searchUsers(searchValue).finally(() => {
                searchLoader = false;
            });
        }, DONE_TYPING_INTERVAL);
    };

    const handleKeyDown = () => {
        if (searchValue === "") joignableRoom.set([]);
        clearTimeout(typingTimer);
    };

    const setConnectedUsersFilter = () => {
        const SpaceProvider = LocalSpaceProviderSingleton.getInstance();
        if (!SpaceProvider) return;

        const allWorldUserSpace = SpaceProvider.get(WORLD_SPACE_NAME);
        const connectedUsersFilter = allWorldUserSpace.getSpaceFilter(CONNECTED_USER_FILTER_NAME);

        if ($chatSearchBarValue === "" && connectedUsersFilter.getFilterType() !== "spaceFilterEverybody") {
            connectedUsersFilter.setFilter({
                $case: "spaceFilterEverybody",
                spaceFilterEverybody: {}
            });

            return;
        }

        connectedUsersFilter.setFilter({
            $case: "spaceFilterContainName",
            spaceFilterContainName: {
                value: $chatSearchBarValue
            }
        });


    };

    const searchAccesibleRooms = () => {
        chat
            .searchAccesibleRooms($chatSearchBarValue)
            .then((chatRooms: { id: string, name: string | undefined }[]) => {
                console.log(chatRooms);
                joignableRoom.set(chatRooms);
            })
            .finally(() => {
                searchLoader = false;
            });
        return;
    };

</script>

<div class="tw-flex tw-flex-col tw-gap-2 tw-h-full">
    <div id="chatModal" class="tw-absolute tw-to-50%" />
    {#if $chatConnectionStatus === "CONNECTING"}
        <ChatLoader label={$LL.chat.connecting()} />
    {/if}
    {#if $chatConnectionStatus === "ON_ERROR"}
        <p class="tw-text-red-500">Something went wrong with chat</p>
    {/if}
    {#if $chatConnectionStatus === "ONLINE"}
        <nav class="nav">
            <div class="background" class:chat={$navChat === "chat"} />
            <ul>
                <li class:active={$navChat === "users"} on:click={() => navChat.set("users")}>
                    {$LL.chat.users()}
                </li>
                <li class:active={$navChat === "chat"} on:click={() => navChat.set("chat")}>{$LL.chat.chat()}</li>
            </ul>
        </nav>
        <!-- searchbar -->
        <div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid">
            <div class="tw-p-3">
                <input
                    class="wa-searchbar tw-block tw-text-white tw-w-full placeholder:tw-text-sm tw-rounded-3xl tw-px-3 tw-py-1 tw-border-light-purple tw-border tw-border-solid tw-bg-transparent"
                    placeholder={$navChat === "users" ? $LL.chat.searchUser() : $LL.chat.searchChat()}
                    on:keydown={handleKeyDown}
                    on:keyup={handleKeyUp}
                    bind:value={$chatSearchBarValue}
                />
            </div>
        </div>
        {#if $navChat === "users"}
            <RoomUserList />
            {#if searchLoader}
                <ChatLoader label={"search msg ..."} />
            {/if}
        {:else}
            <RoomList />
            {#if searchLoader}
                <ChatLoader label={"search msg ..."} />
            {/if}
        {/if}
    {/if}
</div>

<audio id="newMessageSound" src="./static/new-message.mp3" style="width: 0;height: 0;opacity: 0" />


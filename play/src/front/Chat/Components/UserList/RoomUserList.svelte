<script lang="ts">
    import { onMount } from "svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { ChatUser } from "../../Connection/ChatConnection";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { chatSearchBarValue, shownRoomListStore } from "../../Stores/ChatStore";
    import { UserProviderMerger } from "../../UserProviderMerger/UserProviderMerger";
    import UserList from "./UserList.svelte";
    import { IconChevronUp } from "@wa-icons";

    export let userProviderMerger: UserProviderMerger;

    const USERS_BY_ROOM_LIMITATION = 200;

    onMount(() => {
        if ($shownRoomListStore === "") shownRoomListStore.set($LL.chat.userList.isHere());
    });

    $: usersByRoom = userProviderMerger.usersByRoomStore;

    $: roomsWithUsers = Array.from($usersByRoom.entries())
        .reduce((roomsWithUsersAcc, [currentPlayUri, currentRoomWithUsers]) => {
            let roomName = currentRoomWithUsers.roomName ?? $LL.chat.userList.disconnected();

            if (currentPlayUri === gameManager?.getCurrentGameScene()?.roomUrl) roomName = $LL.chat.userList.isHere();

            const myId = gameManager.getCurrentGameScene().connection?.getUserId();

            const users = currentRoomWithUsers.users
                .filter(({ username }) => {
                    return username
                        ? username.toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase())
                        : false;
                })
                .sort((chatUserA: ChatUser, chatUserB: ChatUser) => {
                    if (chatUserA.id === myId) return -1;
                    if (chatUserB.id === myId) return 1;
                    return chatUserA.username?.localeCompare(chatUserB.username || "") || -1;
                })
                .slice(0, USERS_BY_ROOM_LIMITATION);

            if (users.length > 0) roomsWithUsersAcc.push([roomName, users]);

            return roomsWithUsersAcc;
        }, [] as [string, ChatUser[]][])
        .sort(([aKey, _aValue]: [string, ChatUser[]], [bKey, _bValue]: [string, ChatUser[]]) => {
            if (aKey === $LL.chat.userList.disconnected()) return 1;
            if (bKey === $LL.chat.userList.disconnected()) return -1;

            if (aKey === $LL.chat.userList.isHere()) return -1;
            if (bKey === $LL.chat.userList.isHere()) return 1;

            return aKey.localeCompare(bKey);
        });
</script>

<div class="tw-flex tw-flex-col tw-overflow-auto">
    {#each roomsWithUsers as [roomName, userInRoom] (roomName)}
        <div
            class=" users tw-flex tw-flex-col tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple tw-shrink-0"
        >
            <div
                class="tw-px-4 tw-py-3 tw-flex tw-items-center tw-flex-0 tw-sticky tw-top-0 tw-z-50 tw-bg-contrast/90  "
            >
                <span
                    class="{roomName !== $LL.chat.userList.disconnected()
                        ? 'tw-bg-light-blue'
                        : 'tw-bg-gray'} tw-text-dark-purple tw-min-w-[20px] tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
                >
                    {#if roomName !== $LL.chat.userList.disconnected()}
                        {userInRoom.length}
                    {/if}
                </span>
                <p class="tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">
                    {roomName}
                </p>
                <button
                    class="tw-text-lighter-purple"
                    on:click={() => shownRoomListStore.set($shownRoomListStore === roomName ? "" : roomName)}
                >
                    <IconChevronUp
                        class={`tw-transform tw-transition ${$shownRoomListStore === roomName ? "" : "tw-rotate-180"}`}
                    />
                </button>
            </div>
            {#if $shownRoomListStore === roomName}
                <div class="tw-flex tw-flex-col tw-flex-1 tw-overflow-auto">
                    <UserList userList={userInRoom} />
                </div>
            {/if}
        </div>
    {/each}
</div>

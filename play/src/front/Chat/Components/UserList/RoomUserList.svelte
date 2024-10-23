<script lang="ts">
    import { onMount } from "svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { ChatUser } from "../../Connection/ChatConnection";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { chatSearchBarValue, navChat, shownRoomListStore } from "../../Stores/ChatStore";
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

<div class="tw-flex tw-flex-col tw-overflow-auto tw-h-full">
    <div class="tw-p-2 tw-flex tw-items-center tw-absolute tw-w-full tw-z-40">
        {#if $navChat === "chat"}
            <button
                class="tw-p-3 hover:tw-bg-white/10 tw-rounded-xl tw-aspect-square tw-w-12"
                on:click={() => navChat.set("users")}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="icon icon-tabler icon-tabler-users"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="#ffffff"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
                    <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    <path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
                </svg>
            </button>
        {:else}
            <button
                class="tw-p-3 hover:tw-bg-white/10 tw-rounded-2xl tw-aspect-square tw-w-12"
                on:click={() => navChat.set("chat")}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="icon icon-tabler icon-tabler-message-circle-2"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="#ffffff"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M3 20l1.3 -3.9a9 8 0 1 1 3.4 2.9l-4.7 1" />
                </svg>
            </button>
        {/if}
        <div class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-grow">
            <div class="tw-text-md tw-font-bold tw-h-5">Adventurers</div>
            <div class="tw-flex tw-items-center tw-justify-center tw-text-success tw-space-x-1.5">
                <div
                    class="tw-text-xs tw-aspect-square tw-w-5 tw-h-5 tw-border tw-border-solid tw-border-success tw-flex tw-items-center tw-justify-center tw-font-bold tw-rounded"
                >
                    14
                </div>
                <!-- TODO HUGO -->
                <div class="tw-text-xs tw-font-bold">Utilisateurs en ligne</div>
                <!-- TODO HUGO -->
            </div>
        </div>
        <div class="tw-h-10 tw-w-10" />
    </div>
    {#each roomsWithUsers as [roomName, userInRoom] (roomName)}
        <div class=" users tw-flex tw-flex-col tw-shrink-0 tw-relative tw-pt-[72px] tw-h-full">
            <button
                class="tw-group tw-relative tw-px-3 tw-rounded-none tw-text-white/75 hover:tw-text-white tw-h-11 hover:tw-bg-contrast-200/10 tw-w-full tw-flex tw-space-x-2 tw-items-center tw-border tw-border-solid tw-border-x-0 tw-border-t tw-border-b-0 tw-border-white/10 tw-text-white tw-outline-none tw-border-y-0 tw-appearance-none tw-m-0"
                on:click={() => shownRoomListStore.set($shownRoomListStore === roomName ? "" : roomName)}
            >
                {#if roomName !== $LL.chat.userList.disconnected()}
                    <div
                        class="{roomName !== $LL.chat.userList.disconnected()
                            ? 'tw-bg-white/10'
                            : 'tw-bg-gray'} tw-text-white tw-min-w-[20px] tw-h-5 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
                    >
                        {userInRoom.length}
                    </div>
                {/if}
                <div class="tw-text-white tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-grow tw-text-left">
                    {roomName}
                </div>
                <div
                    class="tw-transition-all group-hover:tw-bg-white/10 tw-p-1 tw-rounded-lg tw-aspect-square tw-flex tw-items-center tw-justify-center tw-text-white"
                >
                    <IconChevronUp
                        class={`tw-transform tw-transition ${$shownRoomListStore === roomName ? "" : "tw-rotate-180"}`}
                    />
                </div>
            </button>
            {#if $shownRoomListStore === roomName}
                <div class="tw-flex tw-flex-col tw-flex-1 tw-overflow-auto">
                    <UserList userList={userInRoom} />
                </div>
            {/if}
        </div>
    {/each}
</div>

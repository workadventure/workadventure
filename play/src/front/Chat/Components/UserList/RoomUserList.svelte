<script lang="ts">
    import { onMount } from "svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { ChatUser } from "../../Connection/ChatConnection";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { chatSearchBarValue, navChat, shownRoomListStore } from "../../Stores/ChatStore";
    import { UserProviderMerger } from "../../UserProviderMerger/UserProviderMerger";
    import UserList from "./UserList.svelte";
    import { IconChevronUp, IconMessageCircle2, IconUsers } from "@wa-icons";

    const gameScene = gameManager.getCurrentGameScene();
    export let userProviderMerger: UserProviderMerger;
    let userWorldCount = gameScene.worldUserCounter;

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
        <div class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-grow">
            <div class="tw-text-md tw-font-bold tw-h-5">{$LL.chat.adventurers()}</div>
            <div class="tw-flex tw-items-center tw-justify-center tw-text-success tw-space-x-1.5">
                <!-- TODO HUGO -->
                <div
                    class="tw-text-xs tw-aspect-square tw-min-w-5 tw-h-5 tw-px-1 tw-border tw-border-solid tw-border-success tw-flex tw-items-center tw-justify-center tw-font-bold tw-rounded"
                >
                    {$userWorldCount}
                </div>
                <div class="tw-text-xs tw-font-bold">{$LL.chat.onlineUsers()}</div>
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

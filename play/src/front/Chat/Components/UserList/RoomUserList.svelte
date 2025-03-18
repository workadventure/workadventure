<script lang="ts">
    import { onMount } from "svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { ChatUser } from "../../Connection/ChatConnection";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { chatSearchBarValue, shownRoomListStore } from "../../Stores/ChatStore";
    import { UserProviderMerger } from "../../UserProviderMerger/UserProviderMerger";
    import ChatHeader from "../ChatHeader.svelte";
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
            let roomName =
                currentRoomWithUsers.roomName ??
                (currentPlayUri
                    ? new URL(currentPlayUri, window.location.href).pathname
                    : $LL.chat.userList.disconnected());

            if (currentPlayUri === gameManager?.getCurrentGameScene()?.roomUrl) roomName = $LL.chat.userList.isHere();

            const mySpaceUserId = gameManager.getCurrentGameScene().connection?.getSpaceUserId();

            const users = currentRoomWithUsers.users
                .filter(({ username }) => {
                    return username
                        ? username.toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase())
                        : false;
                })
                .sort((chatUserA: ChatUser, chatUserB: ChatUser) => {
                    if (chatUserA.spaceUserId === mySpaceUserId) return -1;
                    if (chatUserB.spaceUserId === mySpaceUserId) return 1;
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
    <ChatHeader />
    <div>
        {#each roomsWithUsers as [roomName, userInRoom] (roomName)}
            <div class=" users tw-flex tw-flex-col tw-shrink-0 tw-relative first:tw-pt-[72px]">
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
                    <div
                        class="tw-text-white tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-grow tw-text-left"
                    >
                        {roomName}
                    </div>
                    <div
                        class="tw-transition-all group-hover:tw-bg-white/10 tw-p-1 tw-rounded-lg tw-aspect-square tw-flex tw-items-center tw-justify-center tw-text-white"
                    >
                        <IconChevronUp
                            class={`tw-transform tw-transition ${
                                $shownRoomListStore === roomName ? "" : "tw-rotate-180"
                            }`}
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
</div>

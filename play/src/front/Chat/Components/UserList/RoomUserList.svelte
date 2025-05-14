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

    const gameScene = gameManager.getCurrentGameScene();
    const isMatrixChatEnabled = gameScene.room.isMatrixChatEnabled;

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

<div class="flex flex-col h-full">
    <ChatHeader />
    <div>
        {#each roomsWithUsers as [roomName, userInRoom] (roomName)}
            <div class=" users flex flex-col shrink-0 relative first:pt-[72px]">
                <button
                    class="group relative px-3 gap-2 rounded-none text-white/75 hover:text-white h-11 hover:bg-contrast-200/10 w-full flex space-x-2 items-center border border-solid border-x-0 border-t border-b-0 border-white/10 text-white outline-none border-y-0 appearance-none m-0"
                    on:click={() => shownRoomListStore.set($shownRoomListStore === roomName ? "" : roomName)}
                >
                    {#if roomName !== $LL.chat.userList.disconnected()}
                        <div
                            class="{roomName !== $LL.chat.userList.disconnected()
                                ? 'bg-white/10'
                                : 'bg-gray'} text-white min-w-[20px] h-5 text-sm font-semibold flex items-center justify-center rounded-sm"
                        >
                            {userInRoom.length}
                        </div>
                    {/if}
                    <div class="text-white text-sm font-bold tracking-widest uppercase grow text-start">
                        {roomName}
                    </div>
                    <div
                        class="transition-all group-hover:bg-white/10 p-1 rounded aspect-square flex items-center justify-center text-white"
                    >
                        <IconChevronUp
                            class={`transform transition ${$shownRoomListStore === roomName ? "" : "rotate-180"}`}
                        />
                    </div>
                </button>
                {#if $shownRoomListStore === roomName}
                    <div class="flex flex-col flex-1 h-fit">
                        <UserList userList={userInRoom} {isMatrixChatEnabled} />
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>

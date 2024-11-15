<script lang="ts">
    import { get } from "svelte/store";
    // eslint-disable-next-line import/no-unresolved
    import { onDestroy, onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue, joignableRoom, navChat, selectedRoomStore } from "../Stores/ChatStore";
    import { ChatRoom } from "../Connection/ChatConnection";
    import { INITIAL_SIDEBAR_WIDTH } from "../../Stores/ChatStore";
    import { userIsConnected } from "../../Stores/MenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import Room from "./Room/Room.svelte";
    import RoomTimeline from "./Room/RoomTimeline.svelte";
    import RoomInvitation from "./Room/RoomInvitation.svelte";
    import JoignableRooms from "./Room/JoignableRooms.svelte";
    import ChatLoader from "./ChatLoader.svelte";
    import ChatError from "./ChatError.svelte";
    import RoomFolder from "./RoomFolder.svelte";
    import CreateRoomOrFolderOption from "./Room/CreateRoomOrFolderOption.svelte";
    import ShowMore from "./ShowMore.svelte";
    import { IconChevronDown, IconChevronRight } from "@wa-icons";

    export let sideBarWidth: number = INITIAL_SIDEBAR_WIDTH;

    const proximityChatRoom = gameManager.getCurrentGameScene().proximityChatRoom;
    const chat = gameManager.chatConnection;

    const chatConnectionStatus = chat.connectionStatus;
    const CHAT_LAYOUT_LIMIT = INITIAL_SIDEBAR_WIDTH * 2;

    let directRooms = chat.directRooms;
    let rooms = chat.rooms;
    //TODO : Make a distinction between invitations to a room or a space;
    let roomInvitations = chat.invitations;
    let roomFolders = chat.roomFolders;

    let displayDirectRooms = false;
    let displayRooms = false;
    let displayRoomInvitations = false;

    onMount(() => {
        expandOrCollapseRoomsIfEmpty();
    });

    const directRoomsUnsubscriber = rooms.subscribe((rooms) => openRoomsIfCollapsedBeforeNewRoom(rooms));
    const roomInvitationsUnsubscriber = roomInvitations.subscribe((roomInvitations) =>
        openRoomInvitationsIfCollapsedBeforeNewRoom(roomInvitations)
    );

    onDestroy(() => {
        directRoomsUnsubscriber();
        roomInvitationsUnsubscriber();
    });

    function openRoomsIfCollapsedBeforeNewRoom(rooms: ChatRoom[]) {
        if (rooms.length !== 0 && displayRooms === false) {
            displayRooms = true;
        }
    }

    function openRoomInvitationsIfCollapsedBeforeNewRoom(roomInvitations: ChatRoom[]) {
        if (roomInvitations.length !== 0 && displayRoomInvitations === false) {
            displayRoomInvitations = true;
        }
    }

    function expandOrCollapseRoomsIfEmpty() {
        displayDirectRooms = $directRooms.length > 0;
        displayRooms = $rooms.length > 0;
        displayRoomInvitations = $roomInvitations.length > 0;
    }

    function toggleDisplayDirectRooms() {
        displayDirectRooms = !displayDirectRooms;
    }

    function toggleDisplayRooms() {
        displayRooms = !displayRooms;
    }

    function toggleDisplayRoomInvitations() {
        displayRoomInvitations = !displayRoomInvitations;
    }

    function toggleDisplayProximityChat() {
        selectedRoomStore.set(proximityChatRoom);
        proximityChatRoom.hasUnreadMessages.set(false);
    }

    $: filteredDirectRoom = $directRooms
        .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
        .sort((a: ChatRoom, b: ChatRoom) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1));

    $: filteredRooms = $rooms
        .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
        .sort((a: ChatRoom, b: ChatRoom) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1));
    $: filteredRoomInvitations = $roomInvitations
        .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
        .sort((a: ChatRoom, b: ChatRoom) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1));

    $: isGuest = chat.isGuest;

    $: displayTwoColumnLayout = sideBarWidth >= CHAT_LAYOUT_LIMIT;

    const isFoldersOpen: { [key: string]: boolean } = {};

    $roomFolders.forEach((folder) => {
        if (!(folder.id in isFoldersOpen)) {
            isFoldersOpen[folder.id] = false;
        }
    });
</script>

<div
    class="tw-flex-1 tw-flex tw-flex-row tw-overflow-auto"
    class:!tw-flex-row={sideBarWidth > INITIAL_SIDEBAR_WIDTH * 2 && $navChat === "chat"}
>
    {#if $selectedRoomStore === undefined || displayTwoColumnLayout}
        <div
            class="tw-w-full"
            style={displayTwoColumnLayout
                ? `border-right:1px solid #4d4b67;padding-right:12px;width:335px ;flex : 0 0 auto`
                : ``}
        >
            {#if $chatConnectionStatus === "CONNECTING" && $userIsConnected}
                <ChatLoader label={$LL.chat.connecting()} />
            {/if}
            {#if $chatConnectionStatus === "ON_ERROR" && $userIsConnected}
                <ChatError />
            {/if}

            {#if !$userIsConnected && gameManager.getCurrentGameScene().room.isChatEnabled}
                <p class="tw-text-gray-400 tw-w-full tw-text-center tw-pt-2">
                    {$LL.chat.requiresLoginForChat()}
                </p>
                <a
                    type="button"
                    class="btn light tw-min-w-[220px] tw-flex tw-justify-center tw-items-center tw-my-2"
                    href="/login"
                    on:click={() => analyticsClient.login()}
                >
                    {$LL.menu.profile.login()}
                </a>
            {/if}

            {#if $chatConnectionStatus === "ONLINE"}
                {#if $joignableRoom.length > 0 && $chatSearchBarValue.trim() !== ""}
                    <p class="tw-p-0 tw-m-0 tw-text-gray-400">{$LL.chat.availableRooms()}</p>
                    <div class="tw-flex tw-flex-col">
                        {#each $joignableRoom as room (room.id)}
                            <JoignableRooms {room} />
                        {/each}
                    </div>
                {/if}
                <button class="tw-p-0 tw-m-0 tw-text-gray-400" on:click={toggleDisplayRoomInvitations}>
                    {#if displayRoomInvitations}
                        <IconChevronDown />
                    {:else}
                        <IconChevronRight />
                    {/if}
                    {$LL.chat.invitations()}
                </button>
                {#if displayRoomInvitations}
                    <div class="tw-flex tw-flex-col tw-overflow-auto">
                        <ShowMore items={filteredRoomInvitations} maxNumber={8} idKey="id" let:item={room}>
                            <RoomInvitation {room} />
                        </ShowMore>
                    </div>
                {/if}
                <div class="tw-flex tw-justify-between">
                    <button class="tw-p-0 tw-m-0 tw-text-gray-400" on:click={toggleDisplayDirectRooms}>
                        {#if displayDirectRooms}
                            <IconChevronDown />
                        {:else}
                            <IconChevronRight />
                        {/if}
                        {$LL.chat.people()}</button
                    >
                </div>

                {#if displayDirectRooms}
                    <div class="tw-flex tw-flex-col tw-overflow-auto">
                        <ShowMore items={filteredDirectRoom} maxNumber={8} idKey="id" let:item={room}>
                            <Room {room} />
                        </ShowMore>
                    </div>
                {/if}

                <div class="tw-flex tw-justify-between">
                    <button class="tw-p-0 tw-m-0 tw-text-gray-400" on:click={toggleDisplayRooms}>
                        {#if displayRooms}
                            <IconChevronDown />
                        {:else}
                            <IconChevronRight />
                        {/if}
                        {$LL.chat.rooms()}</button
                    >
                    {#if $isGuest === false}
                        <CreateRoomOrFolderOption />
                    {/if}
                </div>

                {#if displayRooms}
                    <ShowMore items={filteredRooms} maxNumber={8} idKey="id" let:item={room}>
                        <Room {room} />
                    </ShowMore>
                {/if}
                <!--roomBySpace-->
                {#each Array.from($roomFolders.values()) as rootRoomFolder (rootRoomFolder.id)}
                    <RoomFolder
                        bind:isOpen={isFoldersOpen[rootRoomFolder.id]}
                        name={rootRoomFolder.name}
                        folders={rootRoomFolder.folders}
                        rooms={rootRoomFolder.rooms}
                        isGuest={$isGuest}
                        id={rootRoomFolder.id}
                    />
                {/each}
            {/if}

            <div class="tw-flex tw-justify-between">
                <button class="tw-p-0 tw-m-0 tw-text-gray-400 tw-relative" on:click={toggleDisplayProximityChat}>
                    <IconChevronRight />
                    {$LL.chat.proximity()}
                    <div>
                        <div class="tw-absolute tw-top-1 -tw-right-6 tw-w-8 tw-h-8">
                            <span
                                class="tw-w-4 tw-h-4 tw-block tw-rounded-full tw-absolute tw-top-0 tw-right-0 tw-animate-ping tw-bg-pop-green"
                            />
                            <span
                                class="tw-w-3 tw-h-3  tw-block tw-rounded-full tw-absolute tw-top-0.5 tw-right-0.5 tw-bg-pop-green"
                            />
                        </div>
                    </div>
                </button>
            </div>
        </div>
    {/if}
    {#if $selectedRoomStore !== undefined}
        <RoomTimeline room={$selectedRoomStore} />
    {:else if $selectedRoomStore === undefined && sideBarWidth >= CHAT_LAYOUT_LIMIT}
        <div class="tw-flex tw-flex-col tw-flex-1 tw-pl-4">
            <p class="tw-self-center tw-text-md tw-text-gray-500">{$LL.chat.nothingToDisplay()}</p>
        </div>
    {/if}
</div>

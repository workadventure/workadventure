<script lang="ts">
    import { get } from "svelte/store";
    // eslint-disable-next-line import/no-unresolved
    import { openModal } from "svelte-modals";
    import { onDestroy, onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue, joignableRoom, navChat, selectedRoom } from "../Stores/ChatStore";
    import { ChatRoom } from "../Connection/ChatConnection";
    import { INITIAL_SIDEBAR_WIDTH } from "../../Stores/ChatStore";
    import Room from "./Room/Room.svelte";
    import RoomTimeline from "./Room/RoomTimeline.svelte";
    import RoomInvitation from "./Room/RoomInvitation.svelte";
    import JoignableRooms from "./Room/JoignableRooms.svelte";
    import CreateRoomModal from "./Room/CreateRoomModal.svelte";
    import ChatLoader from "./ChatLoader.svelte";
    import ChatError from "./ChatError.svelte";
    import { IconChevronDown, IconChevronRight, IconSquarePlus } from "@wa-icons";

    export let sideBarWidth: number = INITIAL_SIDEBAR_WIDTH;

    const { chatConnection: chat, proximityChatRoom } = gameManager.getCurrentGameScene();

    const chatConnectionStatus = chat.connectionStatus;
    const CHAT_LAYOUT_LIMIT = INITIAL_SIDEBAR_WIDTH * 2;

    let directRooms = chat.directRooms;
    let rooms = chat.rooms;
    let roomInvitations = chat.invitations;

    let displayDirectRooms = false;
    let displayRooms = false;
    let displayRoomInvitations = false;

    const proximityChatRoomHasUnreadMessage = proximityChatRoom.hasUnreadMessages;

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

    function openCreateRoomModal() {
        openModal(CreateRoomModal);
    }

    function toggleDisplayProximityChat() {
        selectedRoom.set(proximityChatRoom);
        proximityChatRoom.hasUnreadMessages.set(false);
    }

    $: filteredDirectRoom = $directRooms.filter(({ name }) =>
        get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase())
    );
    $: filteredRooms = $rooms.filter(({ name }) =>
        get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase())
    );
    $: filteredRoomInvitations = $roomInvitations.filter(({ name }) =>
        get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase())
    );

    const isGuest = chat.isGuest;

    $: displayTwoColumnLayout = sideBarWidth >= CHAT_LAYOUT_LIMIT;
</script>

<div
    class="tw-flex-1 tw-flex tw-flex-row tw-overflow-hidden"
    class:!tw-flex-row={sideBarWidth > INITIAL_SIDEBAR_WIDTH * 2 && $navChat === "chat"}
>
    {#if $selectedRoom === undefined || displayTwoColumnLayout}
        <div
            class="tw-w-full tw-flex tw-flex-1 tw-flex-col tw-overflow-auto"
            style={displayTwoColumnLayout ? `border-right:1px solid #4d4b67;padding-right:12px;max-width:335px ` : ``}
        >
            {#if $chatConnectionStatus === "CONNECTING"}
                <ChatLoader label={$LL.chat.connecting()} />
            {/if}
            {#if $chatConnectionStatus === "ON_ERROR"}
                <ChatError />
            {/if}
            {#if $chatConnectionStatus === "ONLINE"}
                {#if $joignableRoom.length > 0}
                    <p class="tw-p-0 tw-m-0 tw-text-gray-400">{$LL.chat.availableRooms()}</p>
                    <div class="tw-flex tw-flex-col tw-overflow-auto">
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
                        {#each filteredRoomInvitations as room (room.id)}
                            <RoomInvitation {room} />
                        {/each}
                        {#if filteredRoomInvitations.length === 0}
                            <p class="tw-p-1 tw-m-1 tw-text-center tw-text-gray-300">{$LL.chat.nothingToDisplay()}</p>
                        {/if}
                    </div>
                {/if}

                <button class="tw-p-0 tw-m-0 tw-text-gray-400" on:click={toggleDisplayDirectRooms}>
                    {#if displayDirectRooms}
                        <IconChevronDown />
                    {:else}
                        <IconChevronRight />
                    {/if}
                    {$LL.chat.people()}
                </button>
                {#if displayDirectRooms}
                    {#each filteredDirectRoom as room (room.id)}
                        <Room {room} />
                    {/each}
                    {#if filteredDirectRoom.length === 0}
                        <p class="tw-p-0 tw-m-0 tw-text-center tw-text-gray-300">{$LL.chat.nothingToDisplay()}</p>
                    {/if}
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
                        <button
                            data-testid="openCreateRoomModalButton"
                            class="tw-p-0 tw-m-0 tw-text-gray-400"
                            on:click={openCreateRoomModal}
                        >
                            <IconSquarePlus font-size={16} />
                        </button>
                    {/if}
                </div>

                {#if displayRooms}
                    <div class="tw-flex tw-flex-col tw-overflow-auto">
                        {#each filteredRooms as room (room.id)}
                            <Room {room} />
                        {/each}
                        {#if filteredRooms.length === 0}
                            <p class="tw-p-0 tw-m-0 tw-text-center tw-text-gray-300">{$LL.chat.nothingToDisplay()}</p>
                        {/if}
                    </div>
                {/if}
            {/if}

            <div class="tw-flex tw-justify-between">
                <button class="tw-p-0 tw-m-0 tw-text-gray-400" on:click={toggleDisplayProximityChat}>
                    <IconChevronRight />
                    {$LL.chat.proximity()}
                    <div>
                        {#if $proximityChatRoomHasUnreadMessage}
                            <div class="tw-bg-red-500 tw-ml-3 tw-h-3 tw-w-3 tw-rounded-full" />
                        {/if}
                    </div>
                </button>
            </div>
        </div>
    {/if}
    {#if $selectedRoom !== undefined}
        <RoomTimeline room={$selectedRoom} />
    {:else if $selectedRoom === undefined && sideBarWidth >= CHAT_LAYOUT_LIMIT}
        <div class="tw-flex tw-flex-col tw-flex-1 tw-pl-4">
            <p class="tw-self-center tw-text-md tw-text-gray-500">{$LL.chat.nothingToDisplay()}</p>
        </div>
    {/if}
</div>

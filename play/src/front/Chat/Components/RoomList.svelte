<script lang="ts">
    import { get } from "svelte/store";
    // eslint-disable-next-line import/no-unresolved
    import { openModal } from "svelte-modals";
    import { onDestroy, onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue, joignableRoom, proximityRoomConnection, selectedRoom } from "../Stores/ChatStore";
    import { ChatRoom } from "../Connection/ChatConnection";
    import { INITIAL_SIDEBAR_WIDTH } from "../../Stores/ChatStore";
    import Room from "./Room/Room.svelte";
    import RoomTimeline from "./Room/RoomTimeline.svelte";
    import RoomInvitation from "./Room/RoomInvitation.svelte";
    import JoignableRooms from "./Room/JoignableRooms.svelte";
    import CreateRoomModal from "./Room/CreateRoomModal.svelte";
    import { IconChevronDown, IconChevronRight, IconSquarePlus } from "@wa-icons";

    export let sideBarWidth: number = INITIAL_SIDEBAR_WIDTH;

    const chat = gameManager.getCurrentGameScene().chatConnection;
    const CHAT_LAYOUT_LIMIT = INITIAL_SIDEBAR_WIDTH * 2;

    let directRooms = chat.directRooms;
    let rooms = chat.rooms;
    let roomInvitations = chat.invitations;

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

    function openCreateRoomModal() {
        openModal(CreateRoomModal);
    }

    function toggleDisplayProximityChat() {
        if ($proximityRoomConnection && get($proximityRoomConnection?.rooms).length > 0)
            selectedRoom.set(get($proximityRoomConnection.rooms)[0]);
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

    $: isGuest = chat.isGuest;

    $: displayTwoColumnLayout = sideBarWidth >= CHAT_LAYOUT_LIMIT
</script>

<div class="tw-h-full tw-w-full tw-flex tw-flex-row tw-gap-4">
    {#if $selectedRoom === undefined || sideBarWidth >= CHAT_LAYOUT_LIMIT}
        <div class="tw-h-full tw-w-full tw-max-w-xs">
            <button class="tw-p-0 tw-m-0  tw-text-gray-400" on:click={toggleDisplayRoomInvitations}>
                {#if displayRoomInvitations}
                    <IconChevronDown />
                {:else}
                    <IconChevronRight />
                {/if}
                Invitations
            </button>
            {#if displayRoomInvitations}
                {#each filteredRoomInvitations as room (room.id)}
                    <RoomInvitation {room} />
                {/each}
                {#if filteredRoomInvitations.length === 0}
                    <p class="tw-p-0 tw-m-0 tw-text-center tw-text-gray-300">{$LL.chat.nothingToDisplay()}</p>
                {/if}
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

            {#if $joignableRoom.length > 0}
                Joignable Room :
                {#each $joignableRoom as room (room.id)}
                    <JoignableRooms {room} />
                {/each}
            {/if}

            {#if $proximityRoomConnection}
                <div class="tw-flex tw-justify-between">
                    <button class="tw-p-0 tw-m-0 tw-text-gray-400" on:click={toggleDisplayProximityChat}>
                        <IconChevronRight />
                        {$LL.chat.proximity()}
                    </button>
                </div>
            {/if}
        </div>
    {/if}
    {#if $selectedRoom !== undefined}
        <div
            class="tw-flex tw-flex-col tw-h-full tw-w-full tw-flex-auto  {sideBarWidth >= CHAT_LAYOUT_LIMIT &&
                'tw-pl-rtw-border-l-2 tw-border-solid tw-border-r-transparent tw-border-y-transparent tw-border-l-light-purple-alt tw-pl-4'} "
        >
            <RoomTimeline room={$selectedRoom} />
        </div>
    {:else if $selectedRoom === undefined && sideBarWidth >= CHAT_LAYOUT_LIMIT}
        <div
            class="tw-flex tw-flex-col tw-pl-4 tw-h-full tw-w-full tw-flex-auto tw-pl-rtw-border-l-2 tw-border-solid tw-border-r-transparent tw-border-y-transparent tw-border-l-light-purple-alt "
        >
            <p class="tw-self-center tw-text-md tw-text-gray-500">{$LL.chat.nothingToDisplay()}</p>
        </div>
    {/if}
</div>

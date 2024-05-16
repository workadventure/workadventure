<script lang="ts">

    import { IconChevronDown, IconChevronRight, IconSquarePlus } from "@tabler/icons-svelte";
    import { get } from "svelte/store";
    import { openModal } from "svelte-modals";
    import { onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue, joignableRoom, selectedRoom } from "../Stores/ChatStore";
    import Room from "./Room/Room.svelte";
    import RoomTimeline from "./Room/RoomTimeline.svelte";
    import RoomInvitation from "./Room/RoomInvitation.svelte";
    import JoignableRooms from "./Room/JoignableRooms.svelte";
    import CreateRoomModal from "./Room/CreateRoomModal.svelte";

    const chat = gameManager.getCurrentGameScene().chatConnection;

    let directRooms = chat.directRooms;
    let rooms = chat.rooms;
    let roomInvitations = chat.invitations;

    let displayDirectRooms = false;
    let displayRooms = false;
    let displayRoomInvitations = false;

    onMount(() => {
        expandOrCollapseRoomsIfEmpty();
    });

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

    $: filteredDirectRoom = $directRooms.filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()));
    $: filteredRooms = $rooms.filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()));
    $: filteredRoomInvitations = $roomInvitations.filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()));

</script>

{#if $selectedRoom !== undefined}
    <RoomTimeline room={$selectedRoom} />
{:else}
    <button class="tw-p-0 tw-m-0 tw-text-gray-400" on:click={toggleDisplayRoomInvitations}>
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
            {$LL.chat.rooms()}</button>
        <button class="tw-p-0 tw-m-0 tw-text-gray-400" on:click={openCreateRoomModal}>
            <IconSquarePlus size={16} />
        </button>
    </div>

    {#if displayRooms}
        {#each filteredRooms as room (room.id)}
            <Room {room} />
        {/each}
        {#if filteredRooms.length === 0}
            <p class="tw-p-0 tw-m-0 tw-text-center tw-text-gray-300">{$LL.chat.nothingToDisplay()}</p>
        {/if}
    {/if}

    {#if $joignableRoom.length > 0}
        Joignable Room :
        {#each $joignableRoom as room (room.id)}
            <JoignableRooms {room} />
        {/each}
    {/if}
{/if}



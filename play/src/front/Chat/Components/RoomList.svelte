<script lang="ts">

    import { IconChevronDown, IconChevronRight, IconSquarePlus } from "@tabler/icons-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue, selectedRoom , joignableRoom } from "../Stores/ChatStore";
    import Room from "./Room/Room.svelte";
    import RoomTimeline from "./Room/RoomTimeline.svelte";
    import AddRoomForm from "./Room/AddRoomForm.svelte";
    import RoomInvitation from "./Room/RoomInvitation.svelte";
    import { get } from "svelte/store";
    import JoignableRooms from "./Room/JoignableRooms.svelte";

    const chat = gameManager.getCurrentGameScene().chatConnection;


    
    let displayDirectRooms = true;
    let displayRooms = true;
    let displayRoomInvitations = true;
    let displayAddRoomForm = false;


    function toggleDisplayDirectRooms() {
        displayDirectRooms = !displayDirectRooms;
    }

    function toggleDisplayRooms() {
        displayRooms = !displayRooms;
    }

    function toggleDisplayRoomInvitations() {
        displayRoomInvitations = !displayRoomInvitations;
    }

    function toggleDisplayAddRoomForm() {
        displayAddRoomForm = !displayAddRoomForm;
    }
    
    let directRooms = chat.directRooms
    let rooms = chat.rooms
    let roomInvitations = chat.invitations

    $: filteredDirectRoom = $directRooms.filter(({name})=> get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
    $: filteredRooms = $rooms.filter(({name})=> get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
    $: filteredRoomInvitations = $roomInvitations.filter(({name})=> get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))


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
    {/if}

    <div class="tw-flex tw-justify-between">
        <button class="tw-p-0 tw-m-0 tw-text-gray-400" on:click={toggleDisplayRooms}>
            {#if displayRooms}
                <IconChevronDown />
            {:else}
                <IconChevronRight />
            {/if}
            {$LL.chat.rooms()}</button>
        <button class="tw-p-0 tw-m-0 tw-text-gray-400" on:click={toggleDisplayAddRoomForm}>
            <IconSquarePlus size={16} />
        </button>
    </div>

    {#if displayAddRoomForm}
        <AddRoomForm on:onCreatedRoom={toggleDisplayAddRoomForm} on:onCancelRoomCreation={toggleDisplayAddRoomForm} />
    {/if}


    {#if displayRooms}
        {#each filteredRooms as room (room.id)}
            <Room {room} />
        {/each}
    {/if}

    {#if $joignableRoom.length>0}
    Joignable Room : 
    {#each $joignableRoom as room (room.id)}
        <JoignableRooms {room}/>
    {/each}
{/if}
{/if}



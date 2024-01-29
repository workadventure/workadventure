<script lang="ts">
    import { fly } from "svelte/transition";
    import { writable } from "svelte/store";
    import { onMount } from "svelte";
    import { MapsCacheSingleMapFormat } from "@workadventure/map-editor";
    import defaultMapImg from "../images/default-map.png";
    import { roomListVisibilityStore } from "../../Stores/ModalStore";
    import { connectionManager } from "../../Connection/ConnectionManager";

    let roomList = new Map<string, MapsCacheSingleMapFormat>();
    let roomListFiltered = writable<Map<string, MapsCacheSingleMapFormat>>(new Map<string, MapsCacheSingleMapFormat>());
    let search = "";
    let currentRoom = connectionManager.currentRoom?.wamUrl;
    let currentMapHost =
        connectionManager.currentRoom && connectionManager.currentRoom?.wamUrl
            ? new URL(connectionManager.currentRoom.wamUrl).host
            : "";

    onMount(async () => {
        // Get the room list from the server
        roomList = await connectionManager.getRoomList();
        roomListFiltered.set(roomList);
    });

    function onUpdateSearch() {
        // Filter the room list based on the search value and update the roomListFiltered
        roomListFiltered.set(new Map<string, MapsCacheSingleMapFormat>());
        const newRoomListFiltered = new Map<string, MapsCacheSingleMapFormat>();
        for (const [key, value] of roomList.entries()) {
            if (
                value.metadata?.name &&
                value.metadata.name.toLocaleLowerCase().indexOf(search.toLocaleLowerCase()) != -1
            ) {
                newRoomListFiltered.set(key, value);
            } else if (
                value.metadata?.description &&
                value.metadata.description.toLocaleLowerCase().indexOf(search.toLocaleLowerCase()) != -1
            ) {
                newRoomListFiltered.set(key, value);
            }
        }
        roomListFiltered.set(newRoomListFiltered);
    }

    function close() {
        // Close the room list
        roomListVisibilityStore.set(false);
    }

    function clickRoom(roomName: string) {
        // Use the room url to join the room
        console.info("not implemented yet", roomName);
    }
</script>

<div
    class="menu-container tw-bg-dark-purple/80 tw-backdrop-blur-sm tw-flex tw-flex-col tw-items-center tw-absolute tw-left-0 tw-top-0 tw-h-screen tw-w-screen tw-p-3"
    transition:fly={{ x: 1000, duration: 500 }}
>
    <label for="search">Search a room</label>
    <input id="search" type="text" placeholder="Value" bind:value={search} on:input={onUpdateSearch} />
    <!-- room card -->
    <div class="tw-flex tw-flex-wrap tw-justify-center tw-overflow-auto">
        {#each Array.from($roomListFiltered) as [roomName, roomData] (roomName)}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                id={roomName}
                class:active={currentRoom?.indexOf(`${currentMapHost}/${roomName}`) != -1}
                class="room-card tw-flex tw-flex-col tw-items-center tw-justify-center tw-cursor-pointer tw-rounded-xl tw-m-12 tw-p-12"
                on:click={() => clickRoom(roomName)}
            >
                <img
                    class="tw-pointer-events-none tw-rounded-full tw-h-56 tw-w-56 tw-mb-3"
                    src={roomData.metadata?.thumbnail ? roomData.metadata?.thumbnail : defaultMapImg}
                    alt={roomData.metadata?.description}
                />
                <span class="tw-pointer-events-none tw-text-2xl tw-font-bold tw-m-0">{roomData.metadata?.name}</span>
                {#if roomData.metadata?.areasSearchable || roomData.metadata?.entitiesSearchable}
                    <span class="tw-pointer-events-none tw-m-0"
                        >{roomData.metadata?.entitiesSearchable ?? 0} objets / {roomData.metadata?.areasSearchable ?? 0}
                        zones</span
                    >
                {/if}
            </div>
        {/each}
    </div>
    <div
        class="tw-bg-dark-purple/90 tw-backdrop-blur-sm tw-absolute tw-bottom-0 tw-left-0 tw-h-16 tw-w-screen tw-flex tw-justify-center tw-content-center tw-items-center"
    >
        <button class="light" on:click={close}>Close</button>
    </div>
</div>

<style lang="scss">
    .room-card {
        &.active {
            background-color: rgb(86 234 255 / 0.3);
        }
        &:hover:not(.active) {
            background-color: rgb(27 27 41 / 0.6);
            transform: scale(1.1);
        }
    }
</style>

<script lang="ts">
    import { fly } from "svelte/transition";
    import { writable } from "svelte/store";
    import { onMount } from "svelte";
    import defaultMapImg from "../images/default-map.png";
    import { roomListVisibilityStore } from "../../Stores/ModalStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { scriptUtils } from "../../Api/ScriptUtils";
    import LL from "../../../i18n/i18n-svelte";

    interface RoomData {
        name: string;
        description?: string;
        thumbnail?: string;
        wamUrl: string | undefined;
        roomUrl: string;
        areasSearchable?: boolean;
        entitiesSearchable?: boolean;
    }

    let search = "";
    const currentRoomUrl = gameManager.getCurrentGameScene().room.href;
    const roomList = new Map<string, RoomData>();
    const roomListFiltered = writable<Map<string, RoomData>>(new Map<string, RoomData>());
    const isFetching = writable<boolean>(false);
    const isMoving = writable<boolean>(false);
    const roomNameSelected = writable<string | undefined>(undefined);

    async function fetchMaps(): Promise<void> {
        try {
            isFetching.set(true);
            const response = await gameManager.getCurrentGameScene().connection?.queryRoomsFromSameWorld();
            if (response) {
                for (const room of response) {
                    //const url = new URL(room.url);
                    const map: RoomData = { ...room } as RoomData;
                    roomList.set(room.roomUrl, map);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            isFetching.set(false);
            roomListFiltered.set(roomList);
        }
    }

    onMount(async () => {
        // Get the room list from the server
        await fetchMaps();
    });

    function onUpdateSearch() {
        // Filter the room list based on the search value and update the roomListFiltered
        roomListFiltered.set(new Map<string, RoomData>());
        for (const [roomUrl, roomData] of roomList) {
            if (roomData.name.toLowerCase().indexOf(search.toLowerCase()) != -1) {
                $roomListFiltered.set(roomUrl, roomData);
            } else if (
                roomData.description != undefined &&
                roomData.description.toLowerCase().indexOf(search.toLowerCase()) != -1
            ) {
                $roomListFiltered.set(roomUrl, roomData);
            }
        }
    }

    function close() {
        // Close the room list
        roomListVisibilityStore.set(false);
    }

    function clickRoom(roomUrl: string, roomName: string) {
        isMoving.set(true);
        roomNameSelected.set(roomName);
        // Use the room url to join the room
        scriptUtils.goToPage(roomUrl);
        LL;
    }
</script>

<div
    class="menu-container tw-bg-dark-purple/80 tw-backdrop-blur-sm tw-flex tw-flex-col tw-items-center tw-absolute tw-left-0 tw-top-0 tw-h-screen tw-w-screen tw-p-3"
    transition:fly={{ x: 1000, duration: 500 }}
>
    {#if $isMoving}
        <h1>{$LL.mapEditor.listRoom.movingToRoom({ roomNameSelected: $roomNameSelected })}</h1>
    {:else}
        <label for="search">{$LL.mapEditor.listRoom.searchLabel()}</label>
        <input
            id="search"
            type="text"
            placeholder={$LL.mapEditor.listRoom.searchPlaceholder()}
            bind:value={search}
            on:input={onUpdateSearch}
        />
        <!-- room card -->
        <div class="tw-flex tw-flex-wrap tw-justify-center tw-overflow-auto">
            {#if $isFetching}
                <h3>{$LL.mapEditor.listRoom.isFetching()}</h3>
            {/if}
            {#if !$isFetching && $roomListFiltered.size == 0}
                <h3>{$LL.mapEditor.listRoom.noRoomFound()}</h3>
            {/if}
            {#each Array.from($roomListFiltered) as [roomUrl, roomData] (roomUrl)}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    id={roomUrl}
                    class:active={currentRoomUrl == roomData.roomUrl}
                    class="room-card tw-flex tw-flex-col tw-items-center tw-justify-center tw-cursor-pointer tw-rounded-xl tw-m-12 tw-p-12"
                    on:click={() => clickRoom(roomData.roomUrl, roomData.name)}
                >
                    <img
                        class="tw-pointer-events-none tw-rounded-full tw-h-56 tw-w-56 tw-mb-3"
                        src={roomData.thumbnail ?? defaultMapImg}
                        alt={roomData.name}
                    />
                    <span class="tw-pointer-events-none tw-text-2xl tw-font-bold tw-m-0">{roomData.name}</span>
                    {#if roomData.areasSearchable || roomData.entitiesSearchable}
                        <span class="tw-pointer-events-none tw-m-0">
                            {$LL.mapEditor.listRoom.items({
                                countEntity: roomData.entitiesSearchable ?? 0,
                                countArea: roomData.areasSearchable ?? 0,
                            })}
                        </span>
                    {/if}
                </div>
            {/each}
        </div>
        <div
            class="tw-bg-dark-purple/90 tw-backdrop-blur-sm tw-absolute tw-bottom-0 tw-left-0 tw-h-16 tw-w-screen tw-flex tw-justify-center tw-content-center tw-items-center"
        >
            <button class="light" on:click={close}>{$LL.mapEditor.listRoom.close()}</button>
        </div>
    {/if}
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

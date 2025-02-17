<script lang="ts">
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
    class="menu-container bg-contrast/80 backdrop-blur-md flex flex-col items-center absolute left-0 top-0 h-screen w-screen pt-24 pointer-events-auto"
>
    {#if $isMoving}
        <h1>{$LL.mapEditor.listRoom.movingToRoom({ roomNameSelected: $roomNameSelected })}</h1>
    {:else}
        <!-- room card -->
        <div class="container">
            <label for="search" class="w-1/2 m-auto text-white pb-2 pl-4 block"
                >{$LL.mapEditor.listRoom.searchLabel()}</label
            >
            <div class="relative flex grow w-1/2 m-auto">
                <input
                    id="search"
                    type="text"
                    placeholder={$LL.mapEditor.listRoom.searchPlaceholder()}
                    bind:value={search}
                    on:input={onUpdateSearch}
                    class="grow input-search input-search-lg peer"
                />
                <svg
                    class="icon icon-tabler icon-tabler-search stroke-contrast-400 absolute top-0 bottom-0 right-5 m-auto peer-focus:stroke-secondary peer-hover:stroke-secondary-500 transition-all peer-focus:-translate-x-1"
                    fill="none"
                    height="20"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                    width="20"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M0 0h24v24H0z" fill="none" stroke="none" />
                    <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                    <path d="M21 21l-6 -6" />
                </svg>
            </div>
            <div class="flex flex-row flex-wrap space-x-4 items-stretch justify-center items-start overflow-auto">
                {#if $isFetching}
                    <h3>{$LL.mapEditor.listRoom.isFetching()}</h3>
                {/if}
                {#if !$isFetching && $roomListFiltered.size === 0}
                    <h3>{$LL.mapEditor.listRoom.noRoomFound()}</h3>
                {/if}
                {#each Array.from($roomListFiltered) as [roomUrl, roomData] (roomUrl)}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        id={roomUrl}
                        class="room-card flex flex-col items-center justify-center cursor-pointer w-56 hover:bg-white/10 rounded-lg overflow-hidden p-3"
                        on:click={() => clickRoom(roomData.roomUrl, roomData.name)}
                    >
                        <div class="h-32 w-full rounded">
                            <img
                                src={roomData.thumbnail ?? defaultMapImg}
                                alt={roomData.name}
                                class="w-full h-full object-cover"
                                on:error={function () {
                                    this.src = defaultMapImg;
                                }}
                            />
                        </div>
                        <div class="py-2 text-center">
                            <div
                                class="pointer-events-none text-lg text-white font-bold m-0 text-ellipsis overflow-hidden w-full px-3"
                            >
                                {roomData.name}
                            </div>
                            {#if currentRoomUrl === new URL(roomData.roomUrl, window.location.href).toString()}
                                <span class="chip chip-sm chip-light inline rounded-sm"> Active </span>
                            {/if}
                            {#if roomData.areasSearchable || roomData.entitiesSearchable}
                                <div class="pointer-events-none m-0 px-3">
                                    {$LL.mapEditor.listRoom.items({
                                        countEntity: roomData.entitiesSearchable ?? 0,
                                        countArea: roomData.areasSearchable ?? 0,
                                    })}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
        <div
            class="bg-contrast/80 absolute bottom-0 left-0 w-screen flex justify-center content-center items-center py-3"
        >
            <button class="btn btn-lg btn-secondary w-1/2 m-auto" on:click={close}
                >{$LL.mapEditor.listRoom.close()}</button
            >
        </div>
    {/if}
</div>

<style lang="scss">
</style>

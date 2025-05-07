<script lang="ts">
    import { writable } from "svelte/store";
    import { onMount } from "svelte";
    import defaultMapImg from "../images/default-map.png";
    import { roomListVisibilityStore } from "../../Stores/ModalStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { scriptUtils } from "../../Api/ScriptUtils";
    import LL from "../../../i18n/i18n-svelte";
    import PopUpContainer from "../PopUp/PopUpContainer.svelte";

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
    }
</script>

<div class="absolute top-0 bottom-0 w-full h-full flex items-center justify-center">
    <div class="w-11/12 lg:w-2/3  relative h-fit">
        <PopUpContainer extraClasses="w-full relative" fullContent={true}>
            <div class="flex flex-col items-center pointer-events-auto w-full">
                {#if $isMoving}
                    <h1>{$LL.mapEditor.listRoom.movingToRoom({ roomNameSelected: $roomNameSelected })}</h1>
                {:else}
                    <!-- room card -->
                    <div class="h-fit w-full flex flex-col items-center gap-8">
                        <div class="w-full flex flex-col items-start gap-2 px-6">
                            <label for="search" class="text-white pl-2">{$LL.mapEditor.listRoom.searchLabel()}</label>
                            <div class="relative flex grow w-full ">
                                <input
                                    id="search"
                                    type="text"
                                    placeholder={$LL.mapEditor.listRoom.searchPlaceholder()}
                                    bind:value={search}
                                    on:input={onUpdateSearch}
                                    class="grow input-search input-search-lg peer w-full"
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
                        </div>
                        <div class="flex flex-row flex-nowrap space-x-4 justify-center items-center w-full min-h-52">
                            {#if $isFetching}
                                <h3>{$LL.mapEditor.listRoom.isFetching()}</h3>
                            {:else if !$isFetching && $roomListFiltered.size === 0}
                                <h3>{$LL.mapEditor.listRoom.noRoomFound()}</h3>
                            {:else}
                                <div class="relative w-full flex space-x-6 snap-mandatory snap-x overflow-x-auto">
                                    <div class="snap-center shrink-0">
                                        <div class="shrink-0 " />
                                    </div>
                                    {#each Array.from($roomListFiltered) as [roomUrl, roomData] (roomUrl)}
                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                        <div
                                            id={roomUrl}
                                            class="flex flex-col items-center snap-center shrink-0 first:pl-8 last:pr-8  rounded-lg overflow-hidden"
                                            on:click={() => clickRoom(roomData.roomUrl, roomData.name)}
                                        >
                                            <div
                                                class="w-full rounded-lg relative overflow-hidden group cursor-pointer"
                                            >
                                                <div
                                                    class="absolute z-10  left-0 bottom-0-0 w-full h-full bg-gradient-to-t to-90% to-transparent {currentRoomUrl ===
                                                    new URL(roomData.roomUrl, window.location.href).toString()
                                                        ? 'from-secondary-900'
                                                        : 'from-contrast'}"
                                                />
                                                <img
                                                    src={roomData.thumbnail ?? defaultMapImg}
                                                    alt={roomData.name}
                                                    class="shrink-0 w-80 h-52 shadow-xl bg-white object-cover group-hover:scale-110 transition-all z-0"
                                                    on:error={function () {
                                                        this.src = defaultMapImg;
                                                    }}
                                                />
                                                <span
                                                    class="absolute z-20 bottom-0 max-w-full w-full flex items-center justify-center text-ellipsis overflow-hidden text-white text-xs font-bold px-2 py-3 bg-se"
                                                >
                                                    {roomData.name}
                                                </span>
                                                {#if currentRoomUrl === new URL(roomData.roomUrl, window.location.href).toString()}
                                                    <span
                                                        class="chip z-20 chip-sm chip-secondary bg-secondary text-white rounded-[8px] absolute top-3 right-3"
                                                    >
                                                        <div class="px-2">Active</div>
                                                    </span>
                                                {/if}
                                            </div>
                                            <div class="py-2 text-center">
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
                                    <div class="snap-center shrink-0">
                                        <div class="shrink-0" />
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
            <div slot="buttons" class="flex flex-row justify-center w-full">
                <button class="btn btn-lg btn-secondary w-1/2 m-auto" on:click={close}>
                    {$LL.mapEditor.listRoom.close()}
                </button>
            </div>
        </PopUpContainer>
    </div>
</div>

<style lang="scss">
</style>

<script lang="ts">
    import { writable } from "svelte/store";
    import { onMount } from "svelte";
    import { SvelteMap } from "svelte/reactivity";
    import defaultMapImg from "../images/default-map.png";
    import { roomListVisibilityStore } from "../../Stores/ModalStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { scriptUtils } from "../../Api/ScriptUtils";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import LL from "../../../i18n/i18n-svelte";
    import PopUpContainer from "../PopUp/PopUpContainer.svelte";
    import Button from "../UI/Button.svelte";
    import Chip from "../UI/Chip.svelte";
    import InputSearch from "../Input/InputSearch.svelte";
    import { IconSearch, IconX } from "@wa-icons";

    interface RoomData {
        name: string;
        description?: string;
        thumbnail?: string;
        wamUrl: string | undefined;
        roomUrl: string;
        areasSearchable?: boolean;
        entitiesSearchable?: boolean;
    }

    let search = $state("");
    const currentRoomUrl = gameManager.getCurrentGameScene().room.href;
    const roomList = new SvelteMap<string, RoomData>();
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

    // Desktop app: the other worlds, recent rooms and links are on its Landing, in a new tab.
    function openLanding() {
        window.WAD?.openLanding?.();
        close();
    }

    function isCurrentRoom(roomUrl: string): boolean {
        return currentRoomUrl === new URL(roomUrl, window.location.href).toString();
    }

    function clickRoom(roomUrl: string, roomName: string) {
        isMoving.set(true);
        roomNameSelected.set(roomName);
        analyticsClient.trackAdminEvent("room_list.room_clicked", { roomId: roomUrl });
        // Use the room url to join the room
        scriptUtils.goToPage(roomUrl);
    }
</script>

<svelte:window onkeydown={(event) => event.key === "Escape" && close()} />

<div class="absolute top-0 bottom-0 w-full h-full flex items-center justify-center">
    <div class="w-11/12 lg:w-2/3 relative h-fit">
        <PopUpContainer extraClasses="w-full relative" fullContent={true} showButtons={!!window.WAD?.openLanding}>
            <div class="flex flex-col pointer-events-auto w-full text-start">
                {#if $isMoving}
                    <h1 class="text-center">
                        {$LL.mapEditor.listRoom.movingToRoom({ roomNameSelected: $roomNameSelected })}
                    </h1>
                {:else}
                    <div class="flex items-center gap-2 mb-4">
                        <div class="relative flex grow">
                            <!-- The list is opened to pick a room: typing filters it straight away. -->
                            <InputSearch
                                id="search"
                                type="text"
                                size="lg"
                                autofocus
                                aria-label={$LL.mapEditor.listRoom.searchLabel()}
                                placeholder={$LL.mapEditor.listRoom.searchLabel()}
                                bind:value={search}
                                oninput={onUpdateSearch}
                                class="grow w-full"
                            />
                            <IconSearch
                                font-size="20"
                                class="absolute top-0 bottom-0 end-5 m-auto text-contrast-400 pointer-events-none"
                            />
                        </div>
                        <button
                            type="button"
                            class="shrink-0 m-0 p-2 rounded flex items-center justify-center text-white hover:bg-white/10"
                            aria-label={$LL.mapEditor.listRoom.close()}
                            title={$LL.mapEditor.listRoom.close()}
                            data-testid="roomListClose"
                            onclick={close}
                        >
                            <IconX font-size="20" />
                        </button>
                    </div>
                    {#if $isFetching}
                        <p class="m-0 py-16 text-center text-white/75">{$LL.mapEditor.listRoom.isFetching()}</p>
                    {:else if $roomListFiltered.size === 0}
                        <p class="m-0 py-16 text-center text-white/75">{$LL.mapEditor.listRoom.noRoomFound()}</p>
                    {:else}
                        <div
                            class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] max-h-[60vh] overflow-y-auto p-1"
                        >
                            {#each Array.from($roomListFiltered) as [roomUrl, roomData] (roomUrl)}
                                {@const isCurrent = isCurrentRoom(roomData.roomUrl)}
                                <button
                                    type="button"
                                    id={roomUrl}
                                    class="group m-0 p-0 flex flex-col text-start bg-transparent border-none rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                    aria-current={isCurrent ? "true" : undefined}
                                    onclick={() => clickRoom(roomData.roomUrl, roomData.name)}
                                >
                                    <span
                                        class="relative block w-full aspect-video rounded-lg overflow-hidden bg-white {isCurrent
                                            ? 'ring-2 ring-secondary'
                                            : ''}"
                                    >
                                        <img
                                            draggable="false"
                                            src={roomData.thumbnail ?? defaultMapImg}
                                            alt=""
                                            class="w-full h-full object-cover group-hover:scale-105 transition-all"
                                            onerror={(e) => {
                                                const img = e.currentTarget as HTMLImageElement;
                                                img.onerror = null;
                                                img.src = defaultMapImg;
                                            }}
                                        />
                                        {#if isCurrent}
                                            <span class="absolute top-2 end-2 flex">
                                                <Chip variant="secondary">{$LL.camera.active()}</Chip>
                                            </span>
                                        {/if}
                                    </span>
                                    <span class="mt-2 px-1 text-sm font-bold text-white truncate w-full">
                                        {roomData.name}
                                    </span>
                                    {#if roomData.description}
                                        <span class="px-1 text-xs text-white/60 line-clamp-2"
                                            >{roomData.description}</span
                                        >
                                    {/if}
                                    {#if roomData.areasSearchable || roomData.entitiesSearchable}
                                        <span class="px-1 text-xs text-white/60">
                                            {$LL.mapEditor.listRoom.items({
                                                countEntity: roomData.entitiesSearchable ?? 0,
                                                countArea: roomData.areasSearchable ?? 0,
                                            })}
                                        </span>
                                    {/if}
                                </button>
                            {/each}
                        </div>
                    {/if}
                {/if}
            </div>
            <!-- The cross closes the list; the bar only holds the desktop app's own entry point. -->
            {#snippet buttons()}
                <div class="flex flex-row justify-center w-full">
                    <Button size="lg" variant="light" class="w-1/2" onclick={openLanding}>
                        {$LL.actionbar.desktop.openRoom()}
                    </Button>
                </div>
            {/snippet}
        </PopUpContainer>
    </div>
</div>

<script lang="ts">
    import { get } from "svelte/store";
    import { RoomFolder, ChatRoom, ChatRoomModeration } from "../Connection/ChatConnection";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue } from "../Stores/ChatStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import Room from "./Room/Room.svelte";
    import CreateRoomOrFolderOption from "./Room/CreateRoomOrFolderOption.svelte";
    import ShowMore from "./ShowMore.svelte";
    import RoomInvitation from "./Room/RoomInvitation.svelte";
    import RoomSuggested from "./Room/RoomSuggested.svelte";
    import { IconChevronUp } from "@wa-icons";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import Spinner from "../../Components/Icons/Spinner.svelte";

    export let rootFolder: boolean;
    export let folder: RoomFolder & ChatRoomModeration;
    $: ({ name, folders, invitations, rooms, id, suggestedRooms, joinableRooms, hasChildRoomsError } = folder);
    let isOpen: boolean = localUserStore.hasFolderOpened(folder.id) ?? false;
    let joinableRoomsOpen = false;
    const isFoldersOpen: { [key: string]: boolean } = {};
    let refreshSpinner: boolean = false;

    const chat = gameManager.chatConnection;

    $: filteredRoom = $rooms
        .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
        .sort((a: ChatRoom, b: ChatRoom) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1));

    $folders?.forEach((folder) => {
        if (!(folder.id in isFoldersOpen)) {
            isFoldersOpen[folder.id] = false;
        }
    });

    $: filteredJoinableRooms = $joinableRooms.filter(
        (joinable) => !$suggestedRooms.some((suggested) => suggested.id === joinable.id)
    );

    function toggleFolder() {
        isOpen = !isOpen;
        if (isOpen) {
            localUserStore.addFolderOpened(id);
        } else {
            localUserStore.removeFolderOpened(id);
        }
    }

    function toggleJoinableRooms() {
        joinableRoomsOpen = !joinableRoomsOpen;
    }


    async function handleRefreshJoinableRooms() {
        console.log("Refreshing joinable rooms for folder:", folder.id);
        refreshSpinner = true;
        try{
            await chat.refreshFolderJoinableRooms(folder.id);

        } catch (error) {
            console.error("Error refreshing joinable rooms for folder:", folder.id, error);
        }
        refreshSpinner = false;
        console.log("Joinable rooms refreshed for folder:", folder.id);
    }

</script>

<div class={`${!rootFolder ? "mx-2 p-1 bg-contrast-300/10 rounded-lg mb-4" : ""}`}>
    <div
        class={`group relative px-3 m-0 rounded-md text-white/75 hover:text-white h-11 hover:bg-contrast-200/10 w-full flex space-x-2 items-center ${
            rootFolder ? "border-solid border-x-0 border-t border-b-0 border-white/10 rounded-none" : "rounded-md"
        }`}
        class:mb-2={isOpen || rootFolder}
    >
        <div class="flex items-center space-x-2 grow m-0 p-0">
            <button class="flex items-center space-x-2 grow m-0 p-0" on:click={toggleFolder}>
                <div
                    class={`${
                        rootFolder
                            ? "text-white/75 group-hover:text-white text-sm font-bold tracking-widest uppercase grow text-start"
                            : "text-sm font-bold tracking-widest uppercase grow text-start"
                    }`}
                >
                    {$name}
                </div>
            </button>
            <CreateRoomOrFolderOption {folder} parentID={id} parentName={$name} />
        </div>

        <button
            class="transition-all group-hover:bg-white/10 p-1 rounded-lg aspect-square flex items-center justify-center text-white"
            on:click={toggleFolder}
        >
            <IconChevronUp class={`transform transition ${!isOpen ? "" : "rotate-180"}`} />
        </button>
    </div>
    <div class="flex flex-col ">
        {#if isOpen}
            <div class="flex flex-col ">
                {#if $suggestedRooms.length > 0 || filteredJoinableRooms.length > 0}
                    <div class="mx-2 p-1 bg-secondary/30 rounded-lg mb-4 border border-solid border-secondary/80">
                        <div
                            class="group relative px-3 m-0 rounded-md text-white/75 hover:text-white h-8 hover:bg-contrast-200/10 w-full flex space-x-2 items-center"
                            class:mb-2={joinableRoomsOpen}
                        >
                            <div class="flex items-center space-x-2 grow m-0 p-0">
                                <button
                                    class="flex items-center space-x-2 grow m-0 p-0"
                                    data-testid="openJoinableRooms"
                                    on:click={toggleJoinableRooms}
                                >
                                    <div class="text-sm font-bold tracking-widest uppercase grow text-start">
                                        {$LL.chat.joinableRooms()}
                                    </div>
                                </button>
                            </div>
                            <button
                                class="transition-all group-hover:bg-white/10 p-1 rounded-lg aspect-square flex items-center justify-center text-white"
                                on:click={toggleJoinableRooms}
                            >
                                <IconChevronUp
                                    class={`transform transition ${!joinableRoomsOpen ? "" : "rotate-180"}`}
                                />
                            </button>
                        </div>
                        {#if $hasChildRoomsError}
                        <div class="{joinableRoomsOpen ? 'pb-2 px-3' : ''}">
                            <button 
                            class="p-2 w-full rounded-md hover:bg-white/10 text-white/75 hover:text-white"
                            on:click={handleRefreshJoinableRooms}
                            title="Retry loading joinable rooms"
                                >
                                {#if refreshSpinner}
                                    <div class="w-full flex flex-row justify-center items-center">
                                        <Spinner size="xs" />
                                    </div>
                                {:else}
                                    <span>{$LL.chat.joinableRoomsError()}</span>
                                {/if}
                            </button>
                        </div>
                        {/if}
                        {#if joinableRoomsOpen}
                            <div class="flex flex-col overflow-auto ps-3 pe-4 pb-3">
                                {#if $suggestedRooms.length > 0}
                                    <div class="bg-white/10 rounded-md">
                                        <span class="text-sm opacity-80 p-2">
                                            {$LL.chat.suggestedRooms()} :
                                        </span>
                                        <ShowMore items={$suggestedRooms} maxNumber={8} idKey="id" let:item={room}>
                                            <RoomSuggested roomInformation={room} />
                                        </ShowMore>
                                    </div>
                                {/if}
                                {#if filteredJoinableRooms.length > 0}
                                    <ShowMore items={filteredJoinableRooms} maxNumber={8} idKey="id" let:item={room}>
                                        <RoomSuggested roomInformation={room} />
                                    </ShowMore>
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
            <div class="flex flex-col overflow-visible">
                {#if $invitations.length > 0}
                    <div class="flex flex-col overflow-auto ps-3 pe-4 pb-3">
                        <ShowMore items={$invitations} maxNumber={8} idKey="id" let:item={room}>
                            <RoomInvitation {room} />
                        </ShowMore>
                    </div>
                {/if}
                {#each Array.from($folders.values()) as folder (folder.id)}
                    <svelte:self {folder} rootFolder={false} />
                {/each}
                <ShowMore
                    items={filteredRoom}
                    maxNumber={8}
                    idKey="id"
                    let:item={room}
                    showNothingToDisplayMessage={false}
                >
                    <Room {room} />
                </ShowMore>
                {#if $rooms.length === 0 && $folders.length === 0 && $suggestedRooms.length === 0}
                    <p
                        class={`${
                            rootFolder
                                ? "self-center text-md text-gray-500"
                                : "py-2 px-3 m-0 text-white/50 italic text-sm"
                        }`}
                    >
                        {$LL.chat.nothingToDisplay()}
                    </p>
                {/if}
            </div>
        {/if}
    </div>
</div>

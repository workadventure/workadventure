<script lang="ts">
    // eslint-disable-next-line import/no-unresolved
    import { get, Readable } from "svelte/store";
    import { ChatRoom, RoomFolder } from "../Connection/ChatConnection";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue } from "../Stores/ChatStore";
    import Room from "./Room/Room.svelte";
    import CreateRoomOrFolderOption from "./Room/CreateRoomOrFolderOption.svelte";
    import ShowMore from "./ShowMore.svelte";
    import { IconChevronDown, IconChevronUp } from "@wa-icons";

    export let folders: Readable<Map<string, RoomFolder>>;
    export let rooms: Readable<Map<string, ChatRoom>>;
    export let name: Readable<string>;
    export let isGuest: boolean;
    export let isOpen: boolean;
    export let id: string;

    const isFoldersOpen: { [key: string]: boolean } = {};

    $: filteredRoom = Array.from($rooms.values())
        .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
        .sort((a: ChatRoom, b: ChatRoom) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1));

    $folders.forEach((folder) => {
        if (!(folder.id in isFoldersOpen)) {
            isFoldersOpen[folder.id] = false;
        }
    });
</script>

<div class="mx-2 p-1 bg-contrast-300/10 rounded-md mb-4">
    <div
        class="group relative px-3 text-white/75 hover:text-white h-11 hover:bg-contrast-200/10 w-full flex space-x-2 items-center rounded"
    >
        <button
            class="flex items-center space-x-2 grow m-0 p-0"
            on:click={() => {
                isOpen = !isOpen;
            }}
        >
            <div class="text-sm font-bold tracking-widest uppercase grow text-left">
                {$name}
            </div>
        </button>
        {#if isGuest === false}
            <CreateRoomOrFolderOption parentID={id} parentName={$name} />
        {/if}
        {#if isOpen}
            <IconChevronUp />
        {:else}
            <IconChevronDown />
        {/if}
    </div>

    {#if isOpen}
        <div class="flex flex-col overflow-auto">
            {#each Array.from($folders.values()) as folder (folder.id)}
                <svelte:self
                    bind:isOpen={isFoldersOpen[folder.id]}
                    id={folder.id}
                    name={folder.name}
                    folders={folder.folders}
                    rooms={folder.rooms}
                    {isGuest}
                />
            {/each}
            <ShowMore items={filteredRoom} maxNumber={8} idKey="id" let:item={room} showNothingToDisplayMessage={false}>
                <Room {room} />
            </ShowMore>
            {#if $rooms.size === 0 && $folders.size === 0}
                <p class="py-2 px-3 m-0 text-white/50 italic text-sm">
                    {$LL.chat.nothingToDisplay()}
                </p>
            {/if}
        </div>
    {/if}
</div>

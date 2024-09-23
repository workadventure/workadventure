<script lang="ts">
    // eslint-disable-next-line import/no-unresolved
    import { get, Readable } from "svelte/store";
    import { ChatRoom, RoomFolder } from "../Connection/ChatConnection";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue } from "../Stores/ChatStore";
    import Room from "./Room/Room.svelte";
    import CreateRoomOrFolderOption from "./Room/CreateRoomOrFolderOption.svelte";
    import ShowMore from "./ShowMore.svelte";
    import { IconChevronDown, IconChevronRight } from "@wa-icons";

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

<div class="tw-flex tw-justify-between">
    <button
        class="tw-p-0 tw-m-0 tw-text-gray-400"
        on:click={() => {
            isOpen = !isOpen;
        }}
    >
        {#if isOpen}
            <IconChevronDown />
        {:else}
            <IconChevronRight />
        {/if}
        {$name}
    </button>
    {#if isGuest === false}
        <CreateRoomOrFolderOption parentID={id} parentName={$name} />
    {/if}
</div>

{#if isOpen}
    <div class="tw-flex tw-flex-col tw-overflow-auto tw-ml-4">
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
            <p class="tw-p-0 tw-m-0 tw-text-center tw-text-gray-300">{$LL.chat.nothingToDisplay()}</p>
        {/if}
    </div>
{/if}

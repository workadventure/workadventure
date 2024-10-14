<script lang="ts">
    // eslint-disable-next-line import/no-unresolved
    import { get, Readable } from "svelte/store";
    import { ChatRoom, RoomFolder } from "../Connection/ChatConnection";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue } from "../Stores/ChatStore";
    import Room from "./Room/Room.svelte";
    import CreateRoomOrFolderOption from "./Room/CreateRoomOrFolderOption.svelte";
    import ShowMore from "./ShowMore.svelte";
    import {IconChevronDown, IconChevronRight, IconChevronUp} from "@wa-icons";

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

<div class="tw-mx-2 tw-p-1 tw-bg-contrast-300/10 tw-rounded-lg tw-mb-4">
    <div class="tw-group tw-relative tw-px-3 tw-text-white/75 hover:tw-text-white tw-h-11 hover:tw-bg-contrast-200/10 tw-w-full tw-flex tw-space-x-2 tw-items-center tw-rounded-md">
        <button
                class="tw-flex tw-items-center tw-space-x-2 tw-grow tw-m-0 tw-p-0"
                on:click={() => {
            isOpen = !isOpen;
        }}
        >
            <div class="tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-grow tw-text-left">
                { $name }
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
        <div class="tw-flex tw-flex-col tw-overflow-auto">
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
                <p class="tw-py-2 tw-px-3 tw-m-0 tw-text-white/50 tw-italic tw-text-sm">{$LL.chat.nothingToDisplay()}</p>
            {/if}
        </div>
    {/if}
</div>

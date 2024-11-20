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
    import RoomInvitation from "./Room/RoomInvitation.svelte";

    export let folders: Readable<RoomFolder[]>;
    export let rooms: Readable<ChatRoom[]>;
    export let invitations: Readable<ChatRoom[]>;
    export let name: Readable<string>;
    export let isGuest: boolean;
    export let isOpen: boolean;
    export let id: string;

    //TODO : garder seulement le folder pour recuperer toutes les props 
    export let folder : ChatRoom;

    
    const isFoldersOpen: { [key: string]: boolean } = {};
    
    $: filteredRoom = $rooms
    .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
    .sort((a: ChatRoom, b: ChatRoom) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1));
    
    $: console.log('>>>>>>>',Array.from($rooms.values()),filteredRoom);

    $folders.forEach((folder) => {
        if (!(folder.id in isFoldersOpen)) {
            isFoldersOpen[folder.id] = false;
        }
    });

    let displayRoomInvitations = $invitations.length > 0
</script>

<div class="tw-mx-2 tw-p-1 tw-bg-contrast-300/10 tw-rounded-lg tw-mb-4">
    <div
        class="tw-group tw-relative tw-px-3 tw-text-white/75 hover:tw-text-white tw-h-11 hover:tw-bg-contrast-200/10 tw-w-full tw-flex tw-space-x-2 tw-items-center tw-rounded-md"
    >
        <button
            class="tw-flex tw-items-center tw-space-x-2 tw-grow tw-m-0 tw-p-0"
            on:click={() => {
                isOpen = !isOpen;
            }}
        >
            <div class="tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-grow tw-text-left">
                {$name}
            </div>
        </button>
        {#if isGuest === false}
            <CreateRoomOrFolderOption parentID={id} parentName={$name} {folder} />
        {/if}
        {#if isOpen}
            <IconChevronUp />
        {:else}
            <IconChevronDown />
        {/if}
    </div>

    {#if isOpen}
    <div class="tw-flex tw-flex-col tw-overflow-auto">
            {#if displayRoomInvitations}
            <div class="tw-flex tw-flex-col tw-overflow-auto tw-pl-3 tw-pr-4 tw-pb-3">
                <ShowMore items={$invitations} maxNumber={8} idKey="id" let:item={room}>
                    <RoomInvitation {room} />
                </ShowMore>
            </div>
        {/if}

            {#each $folders as folder (folder.id)}
                <svelte:self
                    bind:isOpen={isFoldersOpen[folder.id]}
                    id={folder.id}
                    name={folder.name}
                    folders={folder.folderList}
                    rooms={folder.rooms}
                    {isGuest}
                />
            {/each}
            <ShowMore items={filteredRoom} maxNumber={8} idKey="id" let:item={room} showNothingToDisplayMessage={false}>
                <Room {room} />
            </ShowMore>
            {#if $rooms.length === 0 && $folders.length === 0 && $invitations.length === 0}
                <p class="tw-py-2 tw-px-3 tw-m-0 tw-text-white/50 tw-italic tw-text-sm">
                    {$LL.chat.nothingToDisplay()}
                </p>
            {/if}
        </div>
    {/if}
</div>

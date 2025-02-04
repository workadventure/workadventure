<script lang="ts">
    // eslint-disable-next-line import/no-unresolved
    import { get, Readable } from "svelte/store";
    import { ChatRoom, RoomFolder } from "../Connection/ChatConnection";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue } from "../Stores/ChatStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import Room from "./Room/Room.svelte";
    import CreateRoomOrFolderOption from "./Room/CreateRoomOrFolderOption.svelte";
    import ShowMore from "./ShowMore.svelte";
    import { IconChevronUp } from "@wa-icons";
    export let folders: Readable<Map<string, RoomFolder>>;
    export let rooms: Readable<Map<string, ChatRoom>>;
    export let name: Readable<string>;
    export let isGuest: boolean;
    export let id: string;
    export let rootFolder: boolean;
    let isOpen: boolean = localUserStore.hasFolderOpened(id) ?? false;

    const isFoldersOpen: { [key: string]: boolean } = {};

    $: filteredRoom = Array.from($rooms.values())
        .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
        .sort((a: ChatRoom, b: ChatRoom) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1));

    $folders.forEach((folder) => {
        if (!(folder.id in isFoldersOpen)) {
            isFoldersOpen[folder.id] = false;
        }
    });

    function toggleFolder() {
        isOpen = !isOpen;
        if (isOpen) {
            localUserStore.addFolderOpened(id);
        } else {
            localUserStore.removeFolderOpened(id);
        }
    }
</script>

<div class={`${!rootFolder ? "mx-2 p-1 bg-contrast-300/10 rounded-lg mb-4" : ""}`}>
    <div
        class={`group relative px-3 m-0 rounded-none text-white/75 hover:text-white h-11 hover:bg-contrast-200/10 w-full flex space-x-2 items-center ${
            rootFolder ? "border-solid border-x-0 border-t border-b-0 border-white/10" : ""
        }`}
        class:mb-2={isOpen || rootFolder}
    >
        <div class="flex items-center space-x-2 grow m-0 p-0">
            <button class="flex items-center space-x-2 grow m-0 p-0" on:click={toggleFolder}>
                <div
                    class={`${
                        rootFolder
                            ? "text-white/75 group-hover:text-white text-sm font-bold tracking-widest uppercase grow text-left"
                            : "text-sm font-bold tracking-widest uppercase grow text-left"
                    }`}
                >
                    {$name}
                </div>
            </button>
            {#if isGuest === false}
                <CreateRoomOrFolderOption parentID={id} parentName={$name} />
            {/if}
        </div>

        <button
            class="transition-all group-hover:bg-white/10 p-1 rounded-lg aspect-square flex items-center justify-center text-white"
            on:click={toggleFolder}
        >
            <IconChevronUp class={`transform transition ${!isOpen ? "" : "rotate-180"}`} />
        </button>
    </div>

    {#if isOpen}
        <div class="flex flex-col overflow-auto">
            {#each Array.from($folders.values()) as folder (folder.id)}
                <svelte:self
                    id={folder.id}
                    name={folder.name}
                    folders={folder.folders}
                    rooms={folder.rooms}
                    {isGuest}
                    rootFolder={false}
                />
            {/each}
            <ShowMore items={filteredRoom} maxNumber={8} idKey="id" let:item={room} showNothingToDisplayMessage={false}>
                <Room {room} />
            </ShowMore>
            {#if $rooms.size === 0 && $folders.size === 0}
                <p
                    class={`${
                        rootFolder ? "self-center text-md text-gray-500" : "py-2 px-3 m-0 text-white/50 italic text-sm"
                    }`}
                >
                    {$LL.chat.nothingToDisplay()}
                </p>
            {/if}
        </div>
    {/if}
</div>

<script lang="ts">
    import { derived, get } from "svelte/store";
    import { onDestroy } from "svelte";
    import type { RoomFolder, ChatRoom, ChatRoomModeration } from "../Connection/ChatConnection";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue } from "../Stores/ChatStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import Room from "./Room/Room.svelte";
    import CreateRoomOrFolderOption from "./Room/CreateRoomOrFolderOption.svelte";
    import ShowMore from "./ShowMore.svelte";
    import RoomInvitation from "./Room/RoomInvitation.svelte";
    import RoomSuggested from "./Room/RoomSuggested.svelte";
    import { sortByMuteThenLastMessage, sortByMuteThenTimestamp } from "./sortChatRooms";
    import { IconChevronUp } from "@wa-icons";

    export let rootFolder: boolean;
    export let folder: RoomFolder & ChatRoomModeration;
    $: ({ name, folders, invitations, rooms, id, suggestedRooms, joinableRooms } = folder);
    let isOpen: boolean = localUserStore.hasFolderOpened(folder.id) ?? false;
    let joinableRoomsOpen = false;
    const isFoldersOpen: { [key: string]: boolean } = {};

    function getEffectiveLastTimestamp(f: RoomFolder): number {
        const own = f.lastMessageTimestamp;
        const childRooms = get(f.rooms) ?? [];
        const fromRooms = childRooms.length > 0 ? Math.max(...childRooms.map((r) => r.lastMessageTimestamp)) : 0;
        return Math.max(own, fromRooms);
    }

    let sortedFolders: RoomFolder[] = [];
    let unsubSortedFolders: (() => void) | undefined;

    $: {
        const list = $folders ?? [];
        const arr = Array.isArray(list) ? list : [];
        const muteStores = arr.map((f) => f.areNotificationsMuted);
        const folderMessageStores = arr.map((f) => f.messages);
        const childStores = arr.flatMap((f) => [f.rooms, ...(get(f.rooms) ?? []).map((r: ChatRoom) => r.messages)]);
        if (unsubSortedFolders) {
            unsubSortedFolders();
        }
        unsubSortedFolders = derived(
            [folders, ...muteStores, ...folderMessageStores, ...childStores],
            (values: [RoomFolder[] | undefined, ...(boolean | readonly unknown[])[]]) => {
                const folderList = values[0];
                const folderArr = Array.isArray(folderList) ? folderList : [];
                const muted = values.slice(1, 1 + folderArr.length) as boolean[];
                return [...folderArr].sort((a, b) =>
                    sortByMuteThenTimestamp(
                        muted[folderArr.indexOf(a)] ?? false,
                        muted[folderArr.indexOf(b)] ?? false,
                        getEffectiveLastTimestamp(a),
                        getEffectiveLastTimestamp(b)
                    )
                );
            }
        ).subscribe((v: RoomFolder[]) => {
            sortedFolders = v;
        });
    }

    let filteredRoom: ChatRoom[] = [];
    let unsubFilteredRoom: (() => void) | undefined;

    $: {
        const roomList = $rooms ?? [];
        const arr = Array.isArray(roomList) ? roomList : [];
        const roomMuteStores = arr.map((r) => r.areNotificationsMuted);
        const roomMessageStores = arr.map((r) => r.messages);
        if (unsubFilteredRoom) {
            unsubFilteredRoom();
        }
        unsubFilteredRoom = derived(
            [rooms, chatSearchBarValue, ...roomMuteStores, ...roomMessageStores],
            (values: [ChatRoom[] | undefined, string, ...(boolean | readonly unknown[])[]]) => {
                const list = values[0] ?? [];
                const search = (values[1] ?? "").toLocaleLowerCase();
                const muted = values.slice(2, 2 + list.length) as boolean[];
                const filtered = list.filter(({ name }) => get(name).toLocaleLowerCase().includes(search));
                return [...filtered].sort((a, b) =>
                    sortByMuteThenLastMessage(a, b, muted[list.indexOf(a)] ?? false, muted[list.indexOf(b)] ?? false)
                );
            }
        ).subscribe((v: ChatRoom[]) => {
            filteredRoom = v;
        });
    }

    onDestroy(() => {
        unsubSortedFolders?.();
        unsubFilteredRoom?.();
    });

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
            data-testid={`toggleFolder${$name}`}
            on:click={toggleFolder}
        >
            <IconChevronUp class={`transform transition ${!isOpen ? "" : "rotate-180"}`} />
        </button>
    </div>
    <div class="flex flex-col">
        {#if isOpen}
            <div class="flex flex-col">
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
                {#each sortedFolders as folder (folder.id)}
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

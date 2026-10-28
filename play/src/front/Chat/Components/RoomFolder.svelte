<script lang="ts">
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import type { RoomFolder, ChatRoomModeration } from "../Connection/ChatConnection";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue } from "../Stores/ChatStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { matrixUnreadMessagesCountStore } from "../Stores/UnreadMessagesCountStore";
    import RoomSubFolder from "./RoomFolder.svelte";
    import Room from "./Room/Room.svelte";
    import CreateRoomOrFolderOption from "./Room/CreateRoomOrFolderOption.svelte";
    import ShowMore from "./ShowMore.svelte";
    import RoomInvitation from "./Room/RoomInvitation.svelte";
    import RoomSuggested from "./Room/RoomSuggested.svelte";
    import UnreadCount from "./UnreadCount.svelte";
    import { IconChevronUp, IconLoader, IconSparkles } from "@wa-icons";

    interface Props {
        rootFolder: boolean;
        folder: RoomFolder & ChatRoomModeration;
    }

    let { rootFolder, folder }: Props = $props();

    let { name, folders, invitations, rooms, id, suggestedRooms, joinableRooms, joinableRoomsLoading } =
        $derived(folder);
    let isOpen: boolean = $state((() => localUserStore.hasFolderOpened(folder.id) ?? false)());
    let joinableRoomsOpen = $state(false);
    const isFoldersOpen: { [key: string]: boolean } = {};

    let filteredRoom = $derived(
        $rooms
            .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
            .sort((a, b) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1)),
    );

    $folders?.forEach((folder) => {
        if (!(folder.id in isFoldersOpen)) {
            isFoldersOpen[folder.id] = false;
        }
    });

    let filteredJoinableRooms = $derived(
        $joinableRooms.filter((joinable) => !$suggestedRooms.some((suggested) => suggested.id === joinable.id)),
    );

    let hasSuggestedRooms = $derived($suggestedRooms.length > 0);

    // A shown folder has no summary: its rows carry their own counts.
    let collapsedUnreadSummary = $derived(isOpen ? undefined : readUnreadSummary($matrixUnreadMessagesCountStore));

    // Takes the Matrix total only so the summary is recomputed whenever an unread counter changes anywhere.
    function readUnreadSummary(_matrixUnreadTotal: number) {
        return folder.getUnreadSummary();
    }

    function toggleFolder() {
        isOpen = !isOpen;
        if (isOpen) {
            localUserStore.addFolderOpened(id);
            loadOpenedFolderContent();
        } else {
            localUserStore.removeFolderOpened(id);
        }
    }

    function toggleJoinableRooms() {
        joinableRoomsOpen = !joinableRoomsOpen;
    }

    function loadOpenedFolderContent() {
        folder.ensureChildrenLoaded();
        folder.ensureJoinableRoomsLoaded().catch((error) => {
            console.error("Failed to load joinable rooms", error);
        });
    }

    onMount(() => {
        if (isOpen) {
            loadOpenedFolderContent();
        } else {
            folder.preloadSuggestedRooms();
        }
    });
</script>

<div class={`${!rootFolder ? "mx-2 p-1 bg-contrast-300/10 rounded-lg mb-4" : ""}`}>
    <div
        class={`group relative px-3 m-0 rounded-md text-white/75 hover:text-white h-11 hover:bg-contrast-200/10 w-full flex space-x-2 items-center ${
            rootFolder ? "border-solid border-x-0 border-t border-b-0 border-white/10 rounded-none" : "rounded-md"
        }`}
        class:mb-2={isOpen || rootFolder}
    >
        <div class="@container flex items-center space-x-2 grow min-w-0 m-0 p-0">
            <button class="flex items-center space-x-2 grow min-w-0 m-0 p-0" onclick={toggleFolder}>
                <div class="text-white text-sm font-bold tracking-widest uppercase grow min-w-0 truncate text-start">
                    {$name}
                </div>
                {#if hasSuggestedRooms}
                    <span
                        class="shrink-0 inline-flex items-center gap-1 rounded-full border border-solid border-cyan-400/50 bg-cyan-400/15 px-1.5 py-0.5 text-xs font-semibold text-cyan-300"
                        title={$LL.chat.suggestedRooms()}
                        aria-label={$LL.chat.suggestedRooms()}
                        data-testid="folderSuggestedRoomsChip"
                    >
                        <IconSparkles class="h-3 w-3" />
                        <span class="@xs:hidden">{$suggestedRooms.length}</span>
                        <span class="hidden @xs:inline">
                            {$LL.chat.suggestedRoomsToDiscover({ count: $suggestedRooms.length })}
                        </span>
                    </span>
                {/if}
            </button>
            {#if collapsedUnreadSummary && collapsedUnreadSummary.count > 0}
                <UnreadCount
                    count={collapsedUnreadSummary.count}
                    variant={collapsedUnreadSummary.muted ? "muted" : "default"}
                    size="sm"
                />
            {/if}
            <CreateRoomOrFolderOption {folder} parentID={id} parentName={$name} />
        </div>

        <button
            class="transition-all group-hover:bg-white/10 p-1 rounded-lg aspect-square flex items-center justify-center text-white"
            data-testid={`toggleFolder${$name}`}
            onclick={toggleFolder}
        >
            <IconChevronUp class={`transform transition ${!isOpen ? "" : "rotate-180"}`} />
        </button>
    </div>
    <div class="flex flex-col">
        {#if isOpen}
            <div class="flex flex-col">
                {#if $joinableRoomsLoading || $suggestedRooms.length > 0 || filteredJoinableRooms.length > 0}
                    <div class="mx-2 p-1 bg-secondary/30 rounded-lg mb-4 border border-solid border-secondary/80">
                        <div
                            class="group relative px-3 m-0 rounded-md text-white/75 hover:text-white h-8 hover:bg-contrast-200/10 w-full flex space-x-2 items-center"
                            class:mb-2={joinableRoomsOpen}
                        >
                            <div class="flex items-center space-x-2 grow m-0 p-0">
                                <button
                                    class="flex items-center space-x-2 grow m-0 p-0"
                                    data-testid="openJoinableRooms"
                                    onclick={toggleJoinableRooms}
                                >
                                    <div class="text-white text-sm font-bold tracking-widest uppercase grow text-start">
                                        {$LL.chat.joinableRooms()}
                                    </div>
                                </button>
                            </div>
                            <button
                                class="transition-all group-hover:bg-white/10 p-1 rounded-lg aspect-square flex items-center justify-center text-white"
                                onclick={toggleJoinableRooms}
                            >
                                <IconChevronUp
                                    class={`transform transition ${!joinableRoomsOpen ? "" : "rotate-180"}`}
                                />
                            </button>
                        </div>
                        {#if joinableRoomsOpen}
                            <div class="flex flex-col overflow-auto ps-3 pe-4 pb-3">
                                {#if $joinableRoomsLoading}
                                    <div class="flex items-center justify-center p-2 text-white/70">
                                        <IconLoader class="animate-spin" />
                                    </div>
                                {:else if $suggestedRooms.length > 0}
                                    <div class="bg-white/10 rounded-md">
                                        <span class="text-sm opacity-80 p-2">
                                            {$LL.chat.suggestedRooms()} :
                                        </span>
                                        <ShowMore items={$suggestedRooms} maxNumber={8} idKey="id">
                                            {#snippet children({ item: room })}
                                                <RoomSuggested roomInformation={room} />
                                            {/snippet}
                                        </ShowMore>
                                    </div>
                                {/if}
                                {#if filteredJoinableRooms.length > 0}
                                    <ShowMore items={filteredJoinableRooms} maxNumber={8} idKey="id">
                                        {#snippet children({ item: room })}
                                            <RoomSuggested roomInformation={room} />
                                        {/snippet}
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
                        <ShowMore items={$invitations} maxNumber={8} idKey="id">
                            {#snippet children({ item: room })}
                                <RoomInvitation {room} />
                            {/snippet}
                        </ShowMore>
                    </div>
                {/if}
                {#each Array.from($folders.values()) as folder (folder.id)}
                    <RoomSubFolder {folder} rootFolder={false} />
                {/each}
                <ShowMore items={filteredRoom} maxNumber={8} idKey="id" showNothingToDisplayMessage={false}>
                    {#snippet children({ item: room })}
                        <Room {room} />
                    {/snippet}
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

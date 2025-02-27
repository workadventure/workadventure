<script lang="ts">
    // eslint-disable-next-line import/no-unresolved
    import { get } from "svelte/store";
    import { RoomFolder, ChatRoom } from "../Connection/ChatConnection";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue } from "../Stores/ChatStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import Room from "./Room/Room.svelte";
    import CreateRoomOrFolderOption from "./Room/CreateRoomOrFolderOption.svelte";
    import ShowMore from "./ShowMore.svelte";
    import RoomInvitation from "./Room/RoomInvitation.svelte";
    import { IconChevronUp } from "@wa-icons";

    export let rootFolder: boolean;
    export let folder: RoomFolder;
    $: ({ name, folders, invitations, rooms, id } = folder);
    let isOpen: boolean = localUserStore.hasFolderOpened(id) ?? false;

    const isFoldersOpen: { [key: string]: boolean } = {};

    $: filteredRoom = $rooms
        .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
        .sort((a: ChatRoom, b: ChatRoom) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1));

    $folders?.forEach((folder) => {
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

<div class={`${!rootFolder ? "tw-mx-2 tw-p-1 tw-bg-contrast-300/10 tw-rounded-lg tw-mb-4" : ""}`}>
    <div
        class={`tw-group tw-relative tw-px-3 tw-m-0 tw-rounded-none tw-text-white/75 hover:tw-text-white tw-h-11 hover:tw-bg-contrast-200/10 tw-w-full tw-flex tw-space-x-2 tw-items-center ${
            rootFolder ? "tw-border-solid tw-border-x-0 tw-border-t tw-border-b-0 tw-border-white/10" : ""
        }`}
        class:tw-mb-2={isOpen || rootFolder}
    >
        <div class="tw-flex tw-items-center tw-space-x-2 tw-grow tw-m-0 tw-p-0">
            <button class="tw-flex tw-items-center tw-space-x-2 tw-grow tw-m-0 tw-p-0" on:click={toggleFolder}>
                <div
                    class={`${
                        rootFolder
                            ? "tw-text-white/75 group-hover:tw-text-white tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-grow tw-text-left"
                            : "tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-grow tw-text-left"
                    }`}
                >
                    {$name}
                </div>
            </button>
            <CreateRoomOrFolderOption {folder} parentID={id} parentName={$name} />
        </div>

        <button
            class="tw-transition-all group-hover:tw-bg-white/10 tw-p-1 tw-rounded-lg tw-aspect-square tw-flex tw-items-center tw-justify-center tw-text-white"
            on:click={toggleFolder}
        >
            <IconChevronUp class={`tw-transform tw-transition ${!isOpen ? "" : "tw-rotate-180"}`} />
        </button>
    </div>

    {#if isOpen}
        <div class="tw-flex tw-flex-col tw-overflow-auto">
            {#if $invitations.length > 0}
                <div class="tw-flex tw-flex-col tw-overflow-auto tw-pl-3 tw-pr-4 tw-pb-3">
                    <ShowMore items={$invitations} maxNumber={8} idKey="id" let:item={room}>
                        <RoomInvitation {room} />
                    </ShowMore>
                </div>
            {/if}
            {#each Array.from($folders.values()) as folder (folder.id)}
                <svelte:self {folder} rootFolder={false} />
            {/each}
            <ShowMore items={filteredRoom} maxNumber={8} idKey="id" let:item={room} showNothingToDisplayMessage={false}>
                <Room {room} />
            </ShowMore>
            {#if $rooms.length === 0 && $folders.length === 0}
                <p
                    class={`${
                        rootFolder
                            ? "tw-self-center tw-text-md tw-text-gray-500"
                            : "tw-py-2 tw-px-3 tw-m-0 tw-text-white/50 tw-italic tw-text-sm"
                    }`}
                >
                    {$LL.chat.nothingToDisplay()}
                </p>
            {/if}
        </div>
    {/if}
</div>

<script lang="ts">
    // eslint-disable-next-line import/no-unresolved
    import { openModal } from "svelte-modals";
    import { get, Readable } from "svelte/store";
    import { ChatRoom, RoomFolder } from "../Connection/ChatConnection";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue } from "../Stores/ChatStore";
    import CreateRoomModal from "./Room/CreateRoomModal.svelte";
    import CreateFolderModal from "./Room/CreateFolderModal.svelte";
    import Room from "./Room/Room.svelte";
    import RoomOption from "./Room/RoomMenu/RoomOption.svelte";
    import { IconChevronDown, IconChevronRight, IconLogout, IconSquarePlus } from "@wa-icons";

    export let folders: Readable<RoomFolder[]>;
    export let rooms: Readable<ChatRoom[]>;
    export let name: Readable<string>;
    export let isGuest: boolean;
    export let isOpen: boolean;
    export let id: string;

    let optionButtonRef: HTMLButtonElement | undefined = undefined;
    let optionRef: HTMLDivElement | undefined = undefined;
    let hideFolderOptions = true;

    const isFoldersOpen: { [key: string]: boolean } = {};

    console.log(
        "in folder svelte : ",
        get(rooms).map((room) => ({ name: get(room.name), id: room.id }))
    );
    console.log(
        "in folder svelte : ",
        get(folders).map((room) => ({ name: get(room.name), id: room.id }))
    );
    $: filteredRoom = $rooms.filter(({ name }) =>
        get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase())
    );

    $folders.forEach((folder) => {
        if (!(folder.id in isFoldersOpen)) {
            isFoldersOpen[folder.id] = false;
        }
    });

    function openCreateRoomModal(parentSpaceID?: string) {
        openModal(CreateRoomModal, {
            parentSpaceID,
        });
    }

    function openCreateSpaceModal(parentSpaceID?: string) {
        openModal(CreateFolderModal, {
            parentSpaceID,
        });
    }

    function toggleSpaceOption() {
        if (optionButtonRef === undefined) {
            return;
        }
        if (optionRef === undefined) {
            return;
        }
        const { bottom, right } = optionButtonRef.getBoundingClientRect();
        optionRef.style.top = `${bottom}px`;
        optionRef.style.left = `${right}px`;
        hideFolderOptions = !hideFolderOptions;
    }
    function closeMenuAndOpenCreateRoom() {
        hideFolderOptions = true;
        openCreateRoomModal(id);
    }
    function closeMenuAndOpenCreateSpace() {
        hideFolderOptions = true;
        openCreateSpaceModal(id);
    }
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
        {$name}</button
    >
    {#if isGuest === false}
        <button
            data-testid="openCreateRoomModalButton"
            class="tw-p-0 tw-m-0 tw-text-gray-400"
            bind:this={optionButtonRef}
            on:click|preventDefault|stopPropagation={toggleSpaceOption}
        >
            <IconSquarePlus font-size={16} />
        </button>
        <div
            on:mouseleave={toggleSpaceOption}
            bind:this={optionRef}
            class="tw-absolute tw-bg-black/90 tw-rounded-md tw-p-1 tw-z-[1] tw-w-max"
            class:tw-absolue={optionButtonRef !== undefined}
            class:tw-hidden={hideFolderOptions}
        >
            <RoomOption IconComponent={IconLogout} title={"creer une room"} on:click={closeMenuAndOpenCreateRoom} />
            <RoomOption IconComponent={IconLogout} title={"Créer un space"} on:click={closeMenuAndOpenCreateSpace} />
        </div>
    {/if}
</div>

{#if isOpen}
    <div class="tw-flex tw-flex-col tw-overflow-auto tw-ml-4">
        {#each $folders as folder (folder.id)}
            <svelte:self
                bind:isOpen={isFoldersOpen[folder.id]}
                id={folder.id}
                name={folder.name}
                folders={folder.folders}
                rooms={folder.rooms}
                {isGuest}
            />
        {/each}
        {#each filteredRoom as room (room.id)}
            <Room {room} />
        {/each}
        {#if $rooms.length === 0 && $folders.length === 0}
            <p class="tw-p-0 tw-m-0 tw-text-center tw-text-gray-300">{$LL.chat.nothingToDisplay()}</p>
        {/if}
    </div>
{/if}

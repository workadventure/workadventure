<script lang="ts">
    import { openModal } from "svelte-modals";
    import LL from "../../../../i18n/i18n-svelte";
    import CreateRoomModal from "./CreateRoomModal.svelte";
    import CreateFolderModal from "./CreateFolderModal.svelte";
    import RoomOption from "./RoomMenu/RoomOption.svelte";
    import { IconFolder, IconMessage } from "@wa-icons";

    export let parentID: string | undefined = undefined;
    export let parentName = "";
    let optionButtonRef: HTMLButtonElement | undefined = undefined;
    let optionRef: HTMLDivElement | undefined = undefined;
    let hideFolderOptions = true;

    function toggleSpaceOption() {
        if (optionButtonRef === undefined) {
            return;
        }
        hideFolderOptions = !hideFolderOptions;
    }
    function closeMenuAndOpenCreateRoom() {
        openModal(CreateRoomModal, {
            parentID,
        });
    }
    function openCreateSpace() {
        openModal(CreateFolderModal, {
            parentID,
        });
    }
</script>

<button
    data-testid={`openOptionToCreateRoomOrFolder${parentName}`}
    class="tw-m-0 tw-p-1 tw-rounded-lg hover:tw-bg-white/10 {hideFolderOptions
        ? 'tw-bg-transparent'
        : 'tw-bg-secondary'}"
    bind:this={optionButtonRef}
    on:click|preventDefault|stopPropagation={toggleSpaceOption}
>
    <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-dots"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="#ffffff"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        <path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    </svg>
</button>
<div
    on:mouseleave={toggleSpaceOption}
    bind:this={optionRef}
    class="tw-bg-contrast/50 tw-backdrop-blur-md tw-rounded-lg tw-overflow-hidden tw-z-[1] tw-w-max tw-right-4 tw-top-10 tw-p-1"
    class:tw-absolute={optionButtonRef !== undefined}
    class:tw-hidden={hideFolderOptions}
>
    <RoomOption
        dataTestId={`openCreateRoomModalButton${parentName}`}
        IconComponent={IconMessage}
        title={$LL.chat.createRoom.title()}
        on:click={closeMenuAndOpenCreateRoom}
    />
    <RoomOption
        dataTestId={`openCreateFolderModalButton${parentName}`}
        IconComponent={IconFolder}
        title={$LL.chat.createFolder.title()}
        on:click={openCreateSpace}
    />
</div>

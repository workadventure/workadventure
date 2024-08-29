<script lang="ts">
    import { openModal } from "svelte-modals";
    import LL from "../../../../i18n/i18n-svelte";
    import CreateRoomModal from "./CreateRoomModal.svelte";
    import CreateFolderModal from "./CreateFolderModal.svelte";
    import RoomOption from "./RoomMenu/RoomOption.svelte";
    import { IconFolder, IconMessage, IconSquarePlus } from "@wa-icons";

    export let parentID: string | undefined = undefined;
    let optionButtonRef: HTMLButtonElement | undefined = undefined;
    let optionRef: HTMLDivElement | undefined = undefined;
    let hideFolderOptions = true;

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
    data-testid="openOptionToCreateRoomOrFolder"
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
    <RoomOption
        dataTestId="openCreateRoomModalButton"
        IconComponent={IconMessage}
        title={$LL.chat.createRoom.title()}
        on:click={() => {
            hideFolderOptions = true;
            closeMenuAndOpenCreateRoom();
        }}
    />
    <RoomOption
        dataTestId="openCreateFolderModalButton"
        IconComponent={IconFolder}
        title={$LL.chat.createFolder.title()}
        on:click={() => {
            hideFolderOptions = true;
            openCreateSpace();
        }}
    />
</div>

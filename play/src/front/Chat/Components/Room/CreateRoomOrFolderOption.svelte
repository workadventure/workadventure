<script lang="ts">
    import { openModal } from "svelte-modals";
    import LL from "../../../../i18n/i18n-svelte";
    import CreateRoomModal from "./CreateRoomModal.svelte";
    import CreateFolderModal from "./CreateFolderModal.svelte";
    import RoomOption from "./RoomMenu/RoomOption.svelte";
    import { IconDots, IconFolder, IconMessage } from "@wa-icons";

    export let parentID: string | undefined = undefined;
    export let parentName = "";
    let optionButtonRef: HTMLButtonElement | undefined = undefined;
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
        hideFolderOptions = true;
    }
    function openCreateSpace() {
        openModal(CreateFolderModal, {
            parentID,
        });
        hideFolderOptions = true;
    }
</script>

<button
    data-testid={`openOptionToCreateRoomOrFolder${parentName}`}
    class="m-0 p-1 rounded hover:bg-white/10 {hideFolderOptions ? 'bg-transparent' : 'bg-secondary'}"
    bind:this={optionButtonRef}
    on:click|preventDefault|stopPropagation={toggleSpaceOption}
>
    <IconDots />
</button>
<div
    class="bg-contrast/50 backdrop-blur-md rounded overflow-hidden z-50 w-max right-4 top-10 p-1"
    class:absolute={optionButtonRef !== undefined}
    class:hidden={hideFolderOptions}
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

<script lang="ts">
    import { readable } from "svelte/store";
    import { openModal } from "svelte-modals";
    import { EventType } from "matrix-js-sdk";
    import LL from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { RoomFolder, ChatRoomModeration } from "../../Connection/ChatConnection";
    import ManageParticipantsModal from "./ManageParticipantsModal.svelte";
    import CreateFolderModal from "./CreateFolderModal.svelte";
    import CreateRoomModal from "./CreateRoomModal.svelte";
    import RoomOption from "./RoomMenu/RoomOption.svelte";
    import { IconDots, IconFolder, IconLogout, IconMessage, IconUserEdit } from "@wa-icons";

    export let parentID: string | undefined = undefined;
    export let parentName = "";
    export let folder: (RoomFolder & ChatRoomModeration) | undefined;
    let optionButtonRef: HTMLButtonElement | undefined = undefined;
    let hideFolderOptions = true;

    let hasPermissionToCreateRoom = folder?.hasPermissionForRoomStateEvent(EventType.SpaceChild) ?? readable(false);
    const hasPermissionToInvite = folder?.hasPermissionTo("invite") ?? readable(false);
    const hasPermissionToKick = folder?.hasPermissionTo("kick") ?? readable(false);
    const hasPermissionToBan = folder?.hasPermissionTo("ban") ?? readable(false);

    $: shouldDisplayManageParticipantButton = $hasPermissionToInvite || $hasPermissionToKick || $hasPermissionToBan;

    function toggleSpaceOption() {
        hasPermissionToCreateRoom = folder?.hasPermissionForRoomStateEvent(EventType.SpaceChild) ?? readable(false);
        if (optionButtonRef === undefined) {
            return;
        }
        hideFolderOptions = !hideFolderOptions;
    }
    function openCreateSpace() {
        openModal(CreateFolderModal, {
            parentID,
        });
        hideFolderOptions = true;
    }
    function closeMenuAndOpenCreateRoom() {
        openModal(CreateRoomModal, {
            parentID,
        });
        hideFolderOptions = true;
    }
    function closeMenuAndLeaveFolder() {
        toggleSpaceOption();
        folder
            ?.leaveRoom()
            .then(() => {
                notificationPlayingStore.playNotification($LL.chat.roomMenu.leaveRoom.notification());
            })
            .catch(() => console.error("Failed to leave room"));
    }

    function openManageParticipantsModal() {
        if (!folder) return;
        openModal(ManageParticipantsModal, { room: folder });
    }
</script>

<button
    data-testid={`openOptionToCreateRoomOrFolder${parentName}`}
    class="m-0 p-1 rounded-lg hover:bg-white/10 aspect-square flex items-center justify-center {hideFolderOptions
        ? 'bg-transparent'
        : 'bg-secondary'}"
    bind:this={optionButtonRef}
    on:click|preventDefault|stopPropagation={toggleSpaceOption}
>
    <IconDots />
</button>
<div
    class="bg-contrast/50 backdrop-blur-md rounded-md overflow-hidden z-50 w-max end-4 top-10 p-1"
    class:absolute={optionButtonRef !== undefined}
    class:hidden={hideFolderOptions}
>
    {#if $hasPermissionToCreateRoom || !folder}
        <RoomOption
            dataTestId={`openCreateRoomModalButton${parentName}`}
            IconComponent={IconMessage}
            title={folder ? $LL.chat.createRoom.title() : $LL.chat.createRoom.rootTitle()}
            on:click={closeMenuAndOpenCreateRoom}
        />
        <RoomOption
            dataTestId={`openCreateFolderModalButton${parentName}`}
            IconComponent={IconFolder}
            title={$LL.chat.createFolder.title()}
            on:click={openCreateSpace}
        />
        {#if shouldDisplayManageParticipantButton && folder}
            <RoomOption
                dataTestId="manageParticipantOption"
                IconComponent={IconUserEdit}
                title={$LL.chat.manageRoomUsers.roomOption()}
                on:click={openManageParticipantsModal}
            />
        {/if}
    {/if}

    {#if folder}
        <RoomOption
            IconComponent={IconLogout}
            title={$LL.chat.folderMenu.leaveFolder.label()}
            bg="bg-danger-900 hover:bg-danger"
            on:click={closeMenuAndLeaveFolder}
        />
    {/if}
</div>

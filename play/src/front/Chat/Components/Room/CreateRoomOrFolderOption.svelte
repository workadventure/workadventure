<script lang="ts">
    import { get, readable } from "svelte/store";
    import { openModal } from "svelte-modals";
    import ManageParticipantsModal from "./ManageParticipantsModal.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { RoomFolder } from "../../Connection/ChatConnection";
    import { ChatRoomModeration } from "../../Connection/ChatConnection";
    import CreateFolderModal from "./CreateFolderModal.svelte";
    import CreateRoomModal from "./CreateRoomModal.svelte";
    import RoomOption from "./RoomMenu/RoomOption.svelte";
    import { IconDots, IconFolder, IconLogout, IconMessage, IconUserEdit } from "@wa-icons";

    export let parentID: string | undefined = undefined;
    export let parentName = "";
    export let folder: (RoomFolder & ChatRoomModeration) | undefined;
    let optionButtonRef: HTMLButtonElement | undefined = undefined;
    let hideFolderOptions = true;

    console.log(get(folder?.name));

    const hasPermissionToInvite = folder?.hasPermissionTo("invite") ?? readable(false);
    const hasPermissionToKick = folder?.hasPermissionTo("kick") ?? readable(false);
    const hasPermissionToBan = folder?.hasPermissionTo("ban") ?? readable(false);

    $: shouldDisplayManageParticipantButton = $hasPermissionToInvite || $hasPermissionToKick || $hasPermissionToBan;

    function toggleSpaceOption() {
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
        openModal(ManageParticipantsModal, { room: folder });
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
    <IconDots />
</button>
<div
    class="tw-bg-contrast/50 tw-backdrop-blur-md tw-rounded-lg tw-overflow-hidden tw-z-50 tw-w-max tw-right-4 tw-top-10 tw-p-1"
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
    {#if shouldDisplayManageParticipantButton && folder}
        <RoomOption
            dataTestId="manageParticipantOption"
            IconComponent={IconUserEdit}
            title={$LL.chat.manageRoomUsers.roomOption()}
            on:click={openManageParticipantsModal}
        />
    {/if}

    {#if folder}
        <RoomOption
            IconComponent={IconLogout}
            title={$LL.chat.folderMenu.leaveFolder.label()}
            bg="tw-bg-danger/50 hover:tw-bg-danger"
            on:click={closeMenuAndLeaveFolder}
        />
    {/if}
</div>

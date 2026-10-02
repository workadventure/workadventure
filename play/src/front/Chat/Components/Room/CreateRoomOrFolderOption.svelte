<script lang="ts">
    import { readable } from "svelte/store";
    import { EventType } from "matrix-js-sdk";
    import LL from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import type { RoomFolder, ChatRoomModeration } from "../../Connection/ChatConnection";
    import ManageParticipantsModal from "./ManageParticipantsModal.svelte";
    import CreateFolderModal from "./CreateFolderModal.svelte";
    import CreateRoomModal from "./CreateRoomModal.svelte";
    import RoomOption from "./RoomMenu/RoomOption.svelte";
    import { IconDots, IconFolder, IconLogout, IconMessage, IconUserEdit } from "@wa-icons";
    import { modals } from "@wa-modals";

    interface Props {
        parentID?: string;
        parentName: string;
        folder?: RoomFolder & ChatRoomModeration;
    }

    let { parentID = undefined, parentName = "", folder }: Props = $props();
    let optionButtonRef: HTMLButtonElement | undefined = $state(undefined);
    let hideFolderOptions = $state(true);

    let hasPermissionToCreateRoom = $derived(
        folder?.hasPermissionForRoomStateEvent(EventType.SpaceChild) ?? readable(false),
    );
    let hasPermissionToInvite = $derived(folder?.hasPermissionTo("invite") ?? readable(false));
    let hasPermissionToKick = $derived(folder?.hasPermissionTo("kick") ?? readable(false));
    let hasPermissionToBan = $derived(folder?.hasPermissionTo("ban") ?? readable(false));

    let shouldDisplayManageParticipantButton = $derived(
        $hasPermissionToInvite || $hasPermissionToKick || $hasPermissionToBan,
    );

    function toggleSpaceOption() {
        if (optionButtonRef === undefined) {
            return;
        }
        hideFolderOptions = !hideFolderOptions;
    }
    function openCreateSpace() {
        modals.open(CreateFolderModal, {
            parentID,
        });
        hideFolderOptions = true;
    }
    function closeMenuAndOpenCreateRoom() {
        modals.open(CreateRoomModal, {
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
        modals.open(ManageParticipantsModal, { room: folder });
    }
</script>

<button
    data-testid={`openOptionToCreateRoomOrFolder${parentName}`}
    class="m-0 p-1 rounded-lg hover:bg-white/10 aspect-square flex items-center justify-center {hideFolderOptions
        ? 'bg-transparent'
        : 'bg-secondary'}"
    bind:this={optionButtonRef}
    onclick={(event) => {
        event.preventDefault();
        toggleSpaceOption();
    }}
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
            onclick={closeMenuAndOpenCreateRoom}
        />
        <RoomOption
            dataTestId={`openCreateFolderModalButton${parentName}`}
            IconComponent={IconFolder}
            title={$LL.chat.createFolder.title()}
            onclick={openCreateSpace}
        />
        {#if shouldDisplayManageParticipantButton && folder}
            <RoomOption
                dataTestId="manageParticipantOption"
                IconComponent={IconUserEdit}
                title={$LL.chat.manageRoomUsers.roomOption()}
                onclick={openManageParticipantsModal}
            />
        {/if}
    {/if}

    {#if folder}
        <RoomOption
            IconComponent={IconLogout}
            title={$LL.chat.folderMenu.leaveFolder.label()}
            bg="bg-danger-900 hover:bg-danger"
            onclick={closeMenuAndLeaveFolder}
        />
    {/if}
</div>

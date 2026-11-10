<script lang="ts">
    import { readable } from "svelte/store";
    import { EventType } from "matrix-js-sdk/lib/@types/event";
    import LL from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import type { RoomFolder, ChatRoomModeration } from "../../Connection/ChatConnection";
    import { navChat } from "../../Stores/ChatStore";
    import ConfirmDialog from "../ConfirmDialog.svelte";
    import ChatMenu from "../ChatMenu.svelte";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import { folderPanelStore, membersFocusRequestStore } from "../../Stores/RoomSidePanelStore";
    import RoomOption from "./RoomMenu/RoomOption.svelte";
    import { IconFolder, IconLogout, IconMessage, IconUsersGroup } from "@wa-icons";
    import { modals } from "@wa-modals";

    interface Props {
        parentID?: string;
        parentName: string;
        folder?: RoomFolder & ChatRoomModeration;
    }

    let { parentID = undefined, parentName = "", folder }: Props = $props();

    let hasPermissionToCreateRoom = $derived(
        folder?.hasPermissionForRoomStateEvent(EventType.SpaceChild) ?? readable(false),
    );

    function openCreateSpace() {
        navChat.switchToCreate("folder", parentID, parentName);
    }
    function closeMenuAndOpenCreateRoom() {
        navChat.switchToCreate("room", parentID, parentName);
    }
    function closeMenuAndLeaveFolder() {
        if (!folder) return;
        const leavingFolder = folder;
        modals.open(ConfirmDialog, {
            heading: $LL.chat.confirm.leaveFolderTitle({ name: parentName }),
            message: $LL.chat.confirm.leaveFolderMessage(),
            confirmLabel: $LL.chat.confirm.leaveFolder(),
            danger: true,
            onConfirm: async () => {
                await leavingFolder.leaveRoom();
                if ($folderPanelStore?.id === leavingFolder.id) folderPanelStore.set(undefined);
                notificationPlayingStore.playNotification($LL.chat.folderMenu.leaveFolder.notification());
            },
        });
    }

    // In the conversation column, in place of a conversation: a folder has none of its own.
    function openMembers() {
        if (!folder) return;
        selectedRoomStore.set(undefined);
        folderPanelStore.set(folder);
        membersFocusRequestStore.set(true);
    }
</script>

<ChatMenu
    label={$LL.chat.a11y.optionsFor({ name: parentName || $LL.chat.rooms() })}
    dataTestId={`openOptionToCreateRoomOrFolder${parentName}`}
    buttonClass="m-0 p-1 rounded-lg hover:bg-white/10 aspect-square flex items-center justify-center"
    menuClass="bg-contrast/50 backdrop-blur-md rounded-md overflow-hidden z-50 w-max end-4 top-10 p-1"
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
    {/if}
    <!-- Everyone sees the folder's members, as for a room; inviting and moderating are offered to those allowed. -->
    {#if folder}
        <RoomOption
            dataTestId="folderMembersOption"
            IconComponent={IconUsersGroup}
            title={$LL.chat.manageRoomUsers.sectionJoined()}
            onclick={openMembers}
        />
    {/if}

    {#if folder}
        <RoomOption
            IconComponent={IconLogout}
            title={$LL.chat.folderMenu.leaveFolder.label()}
            bg="bg-danger-900 hover:bg-danger"
            onclick={closeMenuAndLeaveFolder}
        />
    {/if}
</ChatMenu>

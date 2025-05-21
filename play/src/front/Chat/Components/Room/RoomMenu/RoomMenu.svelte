<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { openModal } from "svelte-modals";
    import {
        ChatRoomMembershipManagement,
        ChatRoomNotificationControl,
        ChatRoomModeration,
    } from "../../../Connection/ChatConnection";
    import { notificationPlayingStore } from "../../../../Stores/NotificationStore";
    import LL from "../../../../../i18n/i18n-svelte";
    import ManageParticipantsModal from "../ManageParticipantsModal.svelte";
    import RoomOption from "./RoomOption.svelte";
    import { IconDots, IconLogout, IconUserEdit, IconMute, IconUnMute } from "@wa-icons";

    export let room: ChatRoomMembershipManagement & ChatRoomNotificationControl & ChatRoomModeration;
    const areNotificationsMuted = room.areNotificationsMuted;
    let optionButtonRef: HTMLButtonElement | undefined = undefined;
    let hideOptions = true;

    const hasPermissionToInvite = room.hasPermissionTo("invite");
    const hasPermissionToKick = room.hasPermissionTo("kick");
    const hasPermissionToBan = room.hasPermissionTo("ban");

    $: shouldDisplayManageParticipantButton = $hasPermissionToInvite || $hasPermissionToKick || $hasPermissionToBan;

    onMount(() => {
        document.addEventListener("click", closeRoomOptionsOnClickOutside);
    });

    onDestroy(() => {
        document.removeEventListener("click", closeRoomOptionsOnClickOutside);
    });

    function toggleRoomOptions() {
        if (optionButtonRef === undefined) {
            return;
        }
        hideOptions = !hideOptions;
    }

    function closeRoomOptionsOnClickOutside(e: MouseEvent) {
        if (optionButtonRef === undefined) {
            return;
        }
        if (e.target instanceof HTMLElement && !optionButtonRef.contains(e.target)) {
            hideOptions = true;
        }
    }

    function closeMenuAndLeaveRoom() {
        toggleRoomOptions();
        room.leaveRoom()
            .then(() => {
                notificationPlayingStore.playNotification($LL.chat.roomMenu.leaveRoom.notification());
            })
            .catch(() => console.error("Failed to leave room"));
    }

    function openManageParticipantsModal() {
        openModal(ManageParticipantsModal, { room });
    }

    function closeMenuAndSetMuteStatus() {
        toggleRoomOptions();
        if ($areNotificationsMuted) {
            room.unmuteNotification().catch(() => {
                console.error("Failed to unmute room");
            });
            return;
        }
        room.muteNotification().catch(() => {
            console.error("Failed to mute room");
        });
    }
</script>

<button
    data-testid="toggleRoomMenu"
    bind:this={optionButtonRef}
    on:click|preventDefault|stopPropagation={toggleRoomOptions}
    class="m-0 p-0 flex items-center justify-center h-7 w-7 hover:bg-white/10 rounded"
>
    <IconDots font-size="16" />
</button>
<div
    on:mouseleave={toggleRoomOptions}
    class="bg-contrast/50 backdrop-blur-md rounded-md overflow-hidden z-[99] w-max end-2 top-10 p-1"
    class:absolute={optionButtonRef !== undefined}
    class:hidden={hideOptions}
>
    {#if shouldDisplayManageParticipantButton}
        <RoomOption
            dataTestId="manageParticipantOption"
            IconComponent={IconUserEdit}
            title={$LL.chat.manageRoomUsers.roomOption()}
            on:click={openManageParticipantsModal}
        />
    {/if}

    <RoomOption
        IconComponent={$areNotificationsMuted ? IconUnMute : IconMute}
        title={$areNotificationsMuted ? $LL.chat.roomMenu.unmuteRoom() : $LL.chat.roomMenu.muteRoom()}
        on:click={closeMenuAndSetMuteStatus}
    />

    <RoomOption
        IconComponent={IconLogout}
        title={$LL.chat.roomMenu.leaveRoom.label()}
        bg="bg-danger-900 hover:bg-danger"
        on:click={closeMenuAndLeaveRoom}
    />
</div>

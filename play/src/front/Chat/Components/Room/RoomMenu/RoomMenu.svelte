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
    class="tw-m-0 tw-p-0 tw-flex tw-items-center tw-justify-center tw-h-7 tw-w-7 tw-invisible group-hover/chatItem:tw-visible hover:tw-bg-white/10 tw-rounded-lg"
>
    <IconDots font-size="16" />
</button>
<div
    on:mouseleave={toggleRoomOptions}
    class="tw-bg-contrast/50 tw-backdrop-blur-md tw-rounded-lg tw-overflow-hidden tw-z-[1] tw-w-max tw-right-2 tw-top-10 tw-p-1"
    class:tw-absolute={optionButtonRef !== undefined}
    class:tw-hidden={hideOptions}
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
        bg="tw-bg-danger/50 hover:tw-bg-danger"
        on:click={closeMenuAndLeaveRoom}
    />
</div>

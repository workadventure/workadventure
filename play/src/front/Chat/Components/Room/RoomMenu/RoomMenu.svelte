<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { openModal } from "svelte-modals";
    import { ChatRoom } from "../../../Connection/ChatConnection";
    import { notificationPlayingStore } from "../../../../Stores/NotificationStore";
    import LL from "../../../../../i18n/i18n-svelte";
    import InviteParticipantsModal from "../InviteParticipantsModal.svelte";
    import RoomOption from "./RoomOption.svelte";
    import { IconLogout, IconUserPlus, IconMute, IconUnMute } from "@wa-icons";

    export let room: ChatRoom;
    const areNotificationsMuted = room.areNotificationsMuted;
    let optionButtonRef: HTMLButtonElement | undefined = undefined;
    let hideOptions = true;

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

    function openInviteParticipantsModal() {
        openModal(InviteParticipantsModal, { room });
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
    bind:this={optionButtonRef}
    on:click|preventDefault|stopPropagation={toggleRoomOptions}
    class="tw-m-0 tw-p-0 tw-flex tw-items-center tw-justify-center tw-h-7 tw-w-7 tw-invisible group-hover/chatItem:tw-visible hover:tw-bg-white/10 tw-rounded-lg"
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
    on:mouseleave={toggleRoomOptions}
    class="tw-bg-contrast/50 tw-backdrop-blur-md tw-rounded-lg tw-overflow-hidden tw-z-[1] tw-w-max tw-right-2 tw-top-10 tw-p-1"
    class:tw-absolute={optionButtonRef !== undefined}
    class:tw-hidden={hideOptions}
>
    <RoomOption
        IconComponent={IconUserPlus}
        title={$LL.chat.manageRoomUsers.roomOption()}
        on:click={openInviteParticipantsModal}
    />
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

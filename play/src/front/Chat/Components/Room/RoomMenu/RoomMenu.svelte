<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { ChatRoom } from "../../../Connection/ChatConnection";
    import { notificationPlayingStore } from "../../../../Stores/NotificationStore";
    import LL from "../../../../../i18n/i18n-svelte";
    import RoomOption from "./RoomOption.svelte";
    import { IconDotsCircle, IconLogout, IconMute, IconUnMute } from "@wa-icons";

    export let room: ChatRoom;
    const areNotificationsMuted = room.areNotificationsMuted;
    let optionButtonRef: HTMLButtonElement | undefined = undefined;
    let optionRef: HTMLDivElement | undefined = undefined;
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
        if (optionRef === undefined) {
            return;
        }
        const { bottom, right } = optionButtonRef.getBoundingClientRect();
        optionRef.style.top = `${bottom}px`;
        optionRef.style.left = `${right}px`;
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
    class="tw-m-0 tw-p-0 tw-text-gray-400 hover:tw-text-white"
>
    <IconDotsCircle font-size="14" />
</button>
<div
    on:mouseleave={toggleRoomOptions}
    bind:this={optionRef}
    class="tw-absolute tw-bg-black/90 tw-rounded-md tw-p-1 tw-z-[1] tw-w-max"
    class:tw-absolue={optionButtonRef !== undefined}
    class:tw-hidden={hideOptions}
>
    <RoomOption
        IconComponent={IconLogout}
        title={$LL.chat.roomMenu.leaveRoom.label()}
        on:click={closeMenuAndLeaveRoom}
    />
    <RoomOption
        IconComponent={$areNotificationsMuted ? IconUnMute : IconMute}
        title={$areNotificationsMuted ? $LL.chat.roomMenu.unmuteRoom() : $LL.chat.roomMenu.muteRoom()}
        on:click={closeMenuAndSetMuteStatus}
    />
</div>

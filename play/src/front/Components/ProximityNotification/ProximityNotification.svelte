<script lang="ts">
    import { fade } from "svelte/transition";
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import type { ProximityNotification } from "../../Stores/ProximityNotificationStore";
    import { chatNotificationStore } from "../../Stores/ProximityNotificationStore";
    import { chatVisibilityStore } from "../../Stores/ChatStore";
    import { selectedRoomStore } from "../../Chat/Stores/SelectRoomStore";
    import { navChat } from "../../Chat/Stores/ChatStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    import { focusNotificationMessage } from "./NotificationRoomFocus";

    interface Props {
        notification: ProximityNotification;
    }

    let { notification }: Props = $props();

    let roomType = $derived(notification.room ? get(notification.room.type) : (notification.roomType ?? "multiple"));
    let roomName = $derived(notification.room ? get(notification.room.name) : notification.roomName);

    const NOTIFICATION_DURATION = 10000; // 10 seconds

    onMount(() => {
        const timeout = setTimeout(() => {
            chatNotificationStore.removeNotification(notification.id);
        }, NOTIFICATION_DURATION);

        return () => {
            clearTimeout(timeout);
        };
    });

    async function handleClick() {
        chatVisibilityStore.set(true);
        navChat.switchToChat();

        if (notification.openRoomOnClick !== false) {
            let room = notification.room;
            if (!room && notification.roomId) {
                const chatConnection = await gameManager.getChatConnection();
                room = chatConnection.getRoomByID(notification.roomId);
            }
            if (!room) {
                selectedRoomStore.set(undefined);
                return;
            }
            chatNotificationStore.clearRoom(room.id);
            room.setTimelineAsRead();
            selectedRoomStore.set(room);
            focusNotificationMessage(room, notification.messageId);
        } else {
            chatNotificationStore.clearAll();
            // Open the chat on the main chat panel
            selectedRoomStore.set(undefined);
        }
    }

    function handleKeyboardClick(event: KeyboardEvent) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleClick().catch((error) => {
                console.error("Failed to handle chat notification click", error);
            });
        }
    }
</script>

<div
    class="proximity-notification bg-contrast/50 rounded backdrop-blur-md flex gap-3 py-3 pl-5 pr-2 shadow-xl pointer-events-auto z-[900] cursor-pointer hover:bg-contrast/90 transition-colors text-white w-[60%] min-w-[300px] max-w-[600px]"
    onclick={() => handleClick().catch((error) => console.error("Failed to handle chat notification click", error))}
    role="button"
    tabindex="0"
    onkeydown={handleKeyboardClick}
    out:fade={{ duration: 150 }}
>
    <div class="mt-1 text-white text-xl flex-shrink-0">💬</div>

    <div class="flex flex-col text-white flex-1 min-w-0 overflow-hidden">
        <div
            class="font-bold mb-1 text-base text-white truncate font-['Roboto_Condensed'] tracking-normal align-middle"
        >
            {notification.userName}
            {#if roomType !== "direct"}
                {$LL.chat.notification.in()}
                {roomName}
            {/if}
        </div>
        <div
            data-testid="proximity-notification-message"
            class="font-['Roboto_Condensed'] font-normal text-lg leading-[24px] tracking-normal text-white line-clamp-2"
        >
            {notification.message}
        </div>
    </div>
</div>

<style>
    @keyframes slide-up {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    .proximity-notification {
        animation: slide-up 0.3s ease-out;
    }
</style>

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

    export let notification: ProximityNotification;

    $: roomType = notification.room ? get(notification.room.type) : notification.roomType ?? "multiple";
    $: roomName = notification.room ? get(notification.room.name) : notification.roomName;

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
        chatNotificationStore.clearAll();

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
            room.setTimelineAsRead();
            selectedRoomStore.set(room);

            const messageId = notification.messageId;
            if (messageId) {
                setTimeout(() => {
                    scrollToMessage(messageId);
                }, 300);
            }
        } else {
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

    function scrollToMessage(messageId: string) {
        let attempts = 0;
        const maxAttempts = 10;

        const tryScroll = () => {
            const messageElement = document.querySelector(`li[data-event-id="${messageId}"]`);
            if (messageElement) {
                messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
                messageElement.classList.add("highlight-message");
                setTimeout(() => {
                    messageElement.classList.remove("highlight-message");
                }, 2000);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(tryScroll, 200);
            }
        };

        tryScroll();
    }
</script>

<div
    class="proximity-notification bg-contrast/50 rounded backdrop-blur-md flex gap-3 py-3 pl-5 pr-2 shadow-xl pointer-events-auto z-[900] cursor-pointer hover:bg-contrast/90 transition-colors text-white w-[60%] min-w-[300px] max-w-[600px]"
    on:click={handleClick}
    role="button"
    tabindex="0"
    on:keydown={handleKeyboardClick}
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

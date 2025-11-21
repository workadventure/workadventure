<script lang="ts">
    import { fade } from "svelte/transition";
    import { onMount } from "svelte";
    import type { ProximityNotification } from "../../Stores/ProximityNotificationStore";
    import { proximityNotificationStore } from "../../Stores/ProximityNotificationStore";
    import { chatVisibilityStore } from "../../Stores/ChatStore";
    import { selectedRoomStore } from "../../Chat/Stores/SelectRoomStore";
    import { navChat } from "../../Chat/Stores/ChatStore";
    import { gameManager } from "../../Phaser/Game/GameManager";

    export let notification: ProximityNotification;

    const NOTIFICATION_DURATION = 3500; // 3.5 seconds

    onMount(() => {
        const timeout = setTimeout(() => {
            proximityNotificationStore.removeNotification(notification.id);
        }, NOTIFICATION_DURATION);

        return () => {
            clearTimeout(timeout);
        };
    });

    function handleClick() {
        proximityNotificationStore.clearAll();

        const gameScene = gameManager.getCurrentGameScene();
        const proximityChatRoom = gameScene.proximityChatRoom;

        proximityChatRoom.unreadMessagesCount.set(0);
        proximityChatRoom.hasUnreadMessages.set(false);

        chatVisibilityStore.set(true);
        selectedRoomStore.set(proximityChatRoom);
        navChat.switchToChat();

        const messageId = notification.messageId;
        if (messageId) {
            setTimeout(() => {
                scrollToMessage(messageId);
            }, 300);
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
    class="proximity-notification bg-contrast/85 rounded backdrop-blur-md flex gap-3 py-3 pl-5 pr-2 shadow-xl pointer-events-auto z-[900] cursor-pointer hover:bg-contrast/90 transition-colors text-white w-[60%] min-w-[300px] max-w-[600px]"
    on:click={handleClick}
    role="button"
    tabindex="0"
    on:keydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
        }
    }}
    out:fade={{ duration: 150 }}
>
    <div class="mt-1 text-white text-xl flex-shrink-0">💬</div>
    <div class="flex flex-col text-white flex-1 min-w-0 overflow-hidden">
        <div class="font-semibold text-sm mb-1 text-white truncate">{notification.userName || "Unknown"}</div>
        <div class="text-xs opacity-90 text-white line-clamp-2">{notification.message || ""}</div>
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

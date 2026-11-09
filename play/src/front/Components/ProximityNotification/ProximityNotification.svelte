<script lang="ts">
    import { fade } from "svelte/transition";
    import { onMount } from "svelte";
    import type { ProximityNotification } from "../../Stores/ProximityNotificationStore";
    import { chatNotificationStore } from "../../Stores/ProximityNotificationStore";
    import { chatVisibilityStore } from "../../Stores/ChatStore";
    import { selectedRoomStore } from "../../Chat/Stores/SelectRoomStore";
    import { navChat } from "../../Chat/Stores/ChatStore";
    import LL from "../../../i18n/i18n-svelte";
    import Avatar from "../../Chat/Components/Avatar.svelte";
    import { focusNotificationTarget } from "./NotificationRoomFocus";

    interface Props {
        notification: ProximityNotification;
    }

    let { notification }: Props = $props();

    let roomType = $derived(notification.room.type);
    let roomName = $derived(notification.room.name);

    const NOTIFICATION_DURATION = 10000; // 10 seconds

    onMount(() => {
        const timeout = setTimeout(() => {
            chatNotificationStore.removeNotification(notification.id);
        }, NOTIFICATION_DURATION);

        return () => {
            clearTimeout(timeout);
        };
    });

    function handleClick() {
        chatVisibilityStore.set(true);
        navChat.switchToChat();

        if (notification.openRoomOnClick !== false) {
            const room = notification.room;
            chatNotificationStore.clearRoom(room.id);
            room.setTimelineAsRead();
            selectedRoomStore.set(room);
            focusNotificationTarget(room, notification.messageId, notification.sidePanelSection);
        } else {
            chatNotificationStore.clearAll();
            // Open the chat on the main chat panel
            selectedRoomStore.set(undefined);
        }
    }
</script>

<div
    class="proximity-notification bg-contrast/50 backdrop-blur-md flex gap-3 py-3 pr-2 shadow-xl pointer-events-auto z-[900] cursor-pointer hover:bg-contrast/90 transition-colors text-white w-[60%] min-w-[300px] max-w-[600px] {notification.mention
        ? 'rounded-[10px] border border-solid border-danger/60 pl-3.5'
        : 'rounded pl-5'}"
    onclick={handleClick}
    role="button"
    tabindex="0"
    onkeydown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleClick();
        }
    }}
    out:fade={{ duration: 150 }}
>
    {#if notification.mention}
        <div class="relative mt-0.5 flex-shrink-0 self-start">
            <Avatar
                pictureStore={notification.mention.pictureStore}
                fallbackName={notification.userName}
                color={notification.mention.color ?? null}
            />
            <span
                class="absolute -bottom-1.5 -end-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-solid border-contrast bg-danger-1000 text-xxs font-bold"
                >@</span
            >
        </div>
    {:else}
        <div class="mt-1 text-white text-xl flex-shrink-0">💬</div>
    {/if}

    <div class="flex flex-col text-white flex-1 min-w-0 overflow-hidden">
        {#if notification.mention}
            <div class="mb-1 flex items-center gap-2">
                <div class="min-w-0 line-clamp-2 font-bold text-base font-['Roboto_Condensed'] tracking-normal">
                    {$LL.notification.mention({ name: notification.userName })}
                </div>
                {#if $roomType !== "direct"}
                    <span class="ms-auto shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/85"
                        >{$roomName}</span
                    >
                {/if}
            </div>
        {:else}
            <div
                class="font-bold mb-1 text-base text-white truncate font-['Roboto_Condensed'] tracking-normal align-middle"
            >
                {notification.userName}
                {#if $roomType !== "direct"}
                    {$LL.chat.notification.in()}
                    {$roomName}
                {/if}
            </div>
        {/if}
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

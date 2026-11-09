<script lang="ts">
    import { fade } from "svelte/transition";
    import type { Message } from "../../Stores/TypeMessageStore/MessageStore";
    import { textMessageStore } from "../../Stores/TypeMessageStore/TextMessageStore";
    import AnnouncementCard from "../Announcement/AnnouncementCard.svelte";

    interface Props {
        message: Message;
    }

    let { message }: Props = $props();

    function closeTextMessage() {
        textMessageStore.clearMessageById(message.id);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeTextMessage();
        }
    }
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="main-text-message w-fit max-w-xl pointer-events-auto animate-bounce-in" out:fade={{ duration: 150 }}>
    <AnnouncementCard
        text={message.text}
        senderName={message.senderName}
        senderTextures={message.senderTextures}
        broadcastToWorld={message.broadcastToWorld}
        joinUrl={message.joinUrl}
        receivedAt={message.receivedAt}
        onclose={closeTextMessage}
        onjoin={closeTextMessage}
    />
</div>

<style>
    @keyframes bounce-in {
        0% {
            transform: scale(0.5);
            opacity: 0;
        }
        60% {
            transform: scale(1.05);
            opacity: 1;
        }
        100% {
            transform: scale(1);
        }
    }
    .animate-bounce-in {
        animation: bounce-in 0.5s ease-out;
    }
</style>

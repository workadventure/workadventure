<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessage, ChatMessageContent } from "../../../Connection/ChatConnection";
    import MessageAttachmentOffer from "./MessageAttachmentOffer.svelte";

    interface Props {
        content: Readable<ChatMessageContent>;
        message?: ChatMessage;
    }

    let { content, message = undefined }: Props = $props();
</script>

{#if $content.url !== undefined}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video controls class="w-full block rounded">
        <source src={$content.url} />
    </video>
{:else}
    <MessageAttachmentOffer {content} {message} />
{/if}

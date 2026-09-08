<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessage, ChatMessageContent } from "../../../Connection/ChatConnection";
    import LL from "../../../../../i18n/i18n-svelte";
    import MessageAttachmentOffer from "./MessageAttachmentOffer.svelte";

    interface Props {
        content: Readable<ChatMessageContent>;
        message?: ChatMessage;
    }

    let { content, message = undefined }: Props = $props();
</script>

{#if $content.url !== undefined}
    <audio controls src={$content.url} class="max-w-full min-w-96 block p-2"></audio>
{:else}
    <MessageAttachmentOffer
        {content}
        {message}
        loadingLabel={$LL.chat.file.loadingAttachment()}
        errorLabel={$LL.chat.file.attachmentDownloadError()}
    />
{/if}

<style>
    audio::-webkit-media-controls-panel {
        background-color: #d3d8f9;
        -moz-border-radius: 1px !important;
        -webkit-border-radius: 1px !important;
        border-radius: 1px !important;
    }

    audio::-webkit-media-controls-mute-button,
    audio::-webkit-media-controls-play-button,
    audio::-webkit-media-controls-current-time-display,
    audio::-webkit-media-controls-time-remaining-display,
    audio::-webkit-media-controls-timeline {
        color: #1b2a41;
        -moz-border-radius: 1px !important;
        -webkit-border-radius: 1px !important;
        border-radius: 1px !important;
    }
</style>

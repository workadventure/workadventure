<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessage, ChatMessageContent } from "../../../Connection/ChatConnection";
    import LL from "../../../../../i18n/i18n-svelte";
    import MessageAttachmentOffer from "./MessageAttachmentOffer.svelte";
    import { IconInbox } from "@wa-icons";

    interface Props {
        content: Readable<ChatMessageContent>;
        message?: ChatMessage;
    }

    let { content, message = undefined }: Props = $props();
</script>

{#if $content.url !== undefined}
    <a
        href={$content.url}
        download={$content.body}
        class="flex items-center text-white hover:bg-white/10 px-2 py-2 rounded-md hover:no-underline hover:text-white font-bold cursor-pointer"
    >
        <div class="flex items-center justify-center p-2 bg-white/10 rounded-full">
            <IconInbox font-size="20" />
        </div>
        <div class="px-4 truncate">
            {$content.body}
        </div>
    </a>
{:else}
    <MessageAttachmentOffer
        {content}
        {message}
        loadingLabel={$LL.chat.file.loadingAttachment()}
        errorLabel={$LL.chat.file.attachmentDownloadError()}
    />
{/if}

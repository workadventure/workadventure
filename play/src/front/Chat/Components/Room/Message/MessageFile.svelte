<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessage, ChatMessageContent } from "../../../Connection/ChatConnection";
    import { formatFileSize } from "../../../../Utils/FileSize";
    import LL from "../../../../../i18n/i18n-svelte";
    import MessageAttachmentOffer from "./MessageAttachmentOffer.svelte";
    import { IconFileDownload, IconPaperclip } from "@wa-icons";

    interface Props {
        content: Readable<ChatMessageContent>;
        message?: ChatMessage;
    }

    let { content, message = undefined }: Props = $props();
    let size = $derived(message?.attachment?.size);
</script>

{#if $content.url !== undefined}
    <a
        href={$content.url}
        download={$content.body}
        class="block min-w-[200px] max-w-full overflow-hidden rounded-md bg-white/5 text-white hover:text-white hover:no-underline"
    >
        <div class="px-2.5 py-2">
            <div class="flex items-center gap-1 text-sm font-bold">
                <IconPaperclip font-size={14} class="shrink-0" />
                <span class="truncate">{$content.body}</span>
            </div>
            {#if size !== undefined}
                <div class="text-xs text-white/70">{formatFileSize(size)}</div>
            {/if}
        </div>
        <div
            class="flex items-center justify-center gap-1 border-0 border-t border-solid border-white/10 py-2 text-xs font-bold hover:bg-white/10"
        >
            <IconFileDownload font-size={14} />
            {$LL.chat.file.saveFile()}
        </div>
    </a>
{:else}
    <MessageAttachmentOffer {content} {message} />
{/if}

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
    // Our own files are already ours: no point offering to save them.
    let canSave = $derived(!message?.isMyMessage);
</script>

{#if $content.url !== undefined}
    <svelte:element
        this={canSave ? "a" : "div"}
        href={canSave ? $content.url : undefined}
        download={canSave ? $content.body : undefined}
        class="block min-w-[200px] max-w-full overflow-hidden rounded-t-[inherit] bg-white/5 last:rounded-b-[inherit] text-white hover:text-white hover:no-underline"
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
        {#if canSave}
            <div
                class="flex items-center justify-center gap-1 border-0 border-t border-solid border-white/10 py-2 text-xs font-bold hover:bg-white/10"
            >
                <IconFileDownload font-size={14} />
                {$LL.chat.file.saveFile()}
            </div>
        {/if}
    </svelte:element>
{:else}
    <MessageAttachmentOffer {content} {message} />
{/if}

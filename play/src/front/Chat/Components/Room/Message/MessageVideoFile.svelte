<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessage, ChatMessageContent } from "../../../Connection/ChatConnection";
    import LL from "../../../../../i18n/i18n-svelte";

    interface Props {
        content: Readable<ChatMessageContent>;
        message?: ChatMessage;
    }

    let { content, message = undefined }: Props = $props();

    async function downloadAttachment() {
        await message?.downloadAttachment?.();
    }
</script>

{#if $content.mediaState === "pendingDownload"}
    <button class="text-xs text-white/80 px-2 py-2 hover:bg-white/10 rounded" onclick={downloadAttachment}>
        {$LL.chat.file.download()}
        {$content.body}
    </button>
{:else if $content.mediaState === "loading"}
    <div class="text-xs text-white/80 px-2 py-2">
        {$LL.chat.file.loadingAttachment()}
        {#if $content.mediaProgress !== undefined}
            {Math.round($content.mediaProgress * 100)}%
        {/if}
    </div>
{:else if $content.mediaState === "error"}
    <div class="text-xs text-white/80 px-2 py-2">
        {$content.mediaErrorKind === "decrypt"
            ? $LL.chat.file.attachmentDecryptError()
            : $LL.chat.file.attachmentDownloadError()}
    </div>
{:else if $content.url !== undefined}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video controls class="w-full block rounded">
        <source src={$content.url} />
    </video>
{/if}

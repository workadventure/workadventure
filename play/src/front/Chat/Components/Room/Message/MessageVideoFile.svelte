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

    async function refuseAttachment() {
        await message?.refuseAttachment?.();
    }
</script>

{#if $content.url !== undefined}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video controls class="w-full block rounded">
        <source src={$content.url} />
    </video>
{:else if $content.mediaState === "pendingDownload"}
    <div class="text-xs text-white/80 px-2 py-2">
        <div class="truncate font-bold text-white">{$content.body}</div>
        <div class="flex gap-1 mt-1">
            <button
                class="border border-solid border-success text-success hover:bg-success-400/10 rounded text-xs py-1 px-2 m-0"
                onclick={downloadAttachment}
            >
                {$LL.chat.accept()}
            </button>
            <button
                class="border border-solid border-danger text-danger hover:bg-danger-400/10 rounded text-xs py-1 px-2 m-0"
                onclick={refuseAttachment}
            >
                {$LL.chat.decline()}
            </button>
        </div>
    </div>
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
{:else if $content.mediaState === "refused"}
    <div class="text-xs text-white/80 px-2 py-2">{$LL.chat.decline()}</div>
{/if}

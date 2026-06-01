<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessage, ChatMessageContent } from "../../../Connection/ChatConnection";
    import { formatProximityFileTransferRemainingTime } from "../../../Connection/Proximity/ProximityFileTransferEta";
    import LL from "../../../../../i18n/i18n-svelte";
    import { IconInbox } from "@wa-icons";

    interface Props {
        content: Readable<ChatMessageContent>;
        message?: ChatMessage;
    }

    let { content, message = undefined }: Props = $props();
    let estimatedRemainingTime = $derived(
        $content.mediaEstimatedRemainingSeconds === undefined
            ? undefined
            : formatProximityFileTransferRemainingTime($content.mediaEstimatedRemainingSeconds),
    );

    async function downloadAttachment() {
        await message?.downloadAttachment?.();
    }

    async function refuseAttachment() {
        await message?.refuseAttachment?.();
    }
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
{:else if $content.mediaState === "pendingDownload"}
    <div class="flex items-center text-white px-2 py-2 rounded-md font-bold">
        <div class="flex items-center justify-center p-2 bg-white/10 rounded-full">
            <IconInbox font-size="20" />
        </div>
        <div class="px-4 truncate">
            {$content.body}
        </div>
        <div class="flex gap-1">
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
        {#if estimatedRemainingTime !== undefined}
            · {$LL.chat.file.remainingTime({ time: estimatedRemainingTime })}
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
{:else}
    <div class="text-xs text-white/80 px-2 py-2">{$LL.chat.file.attachmentDownloadError()}</div>
{/if}

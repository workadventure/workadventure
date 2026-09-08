<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessage, ChatMessageContent } from "../../../Connection/ChatConnection";
    import { formatProximityFileTransferRemainingTime } from "../../../Connection/Proximity/ProximityFileTransferEta";
    import LL from "../../../../../i18n/i18n-svelte";

    interface Props {
        content: Readable<ChatMessageContent>;
        message?: ChatMessage;
        loadingLabel?: string;
        errorLabel?: string;
    }

    let { content, message = undefined, loadingLabel = undefined, errorLabel = undefined }: Props = $props();
    let estimatedRemainingTime = $derived(
        $content.mediaEstimatedRemainingSeconds === undefined
            ? undefined
            : formatProximityFileTransferRemainingTime($content.mediaEstimatedRemainingSeconds),
    );
</script>

<div class="text-xs text-white/80 px-2 py-2">
    {#if $content.mediaState === "pendingDownload"}
        <div class="truncate font-bold text-white">{$content.body}</div>
        <div class="flex gap-1 mt-1">
            <button
                class="border border-solid border-success text-success hover:bg-success-400/10 rounded text-xs py-1 px-2 m-0"
                onclick={() => message?.downloadAttachment?.()}
            >
                {$LL.chat.accept()}
            </button>
            <button
                class="border border-solid border-danger text-danger hover:bg-danger-400/10 rounded text-xs py-1 px-2 m-0"
                onclick={() => message?.refuseAttachment?.()}
            >
                {$LL.chat.decline()}
            </button>
        </div>
    {:else if $content.mediaState === "loading"}
        {loadingLabel ?? $LL.chat.file.loadingAttachment()}
        {#if $content.mediaProgress !== undefined}
            {Math.round($content.mediaProgress * 100)}%
        {/if}
        {#if estimatedRemainingTime !== undefined}
            · {$LL.chat.file.remainingTime({ time: estimatedRemainingTime })}
        {/if}
    {:else if $content.mediaState === "refused"}
        {$LL.chat.decline()}
    {:else}
        {$content.mediaErrorKind === "decrypt"
            ? $LL.chat.file.attachmentDecryptError()
            : (errorLabel ?? $LL.chat.file.attachmentDownloadError())}
    {/if}
</div>

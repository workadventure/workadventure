<script lang="ts">
    import { readable, type Readable } from "svelte/store";
    import type { ChatAttachmentStatus, ChatMessage, ChatMessageContent } from "../../../Connection/ChatConnection";
    import { formatProximityFileTransferRemainingTime } from "../../../Connection/Proximity/ProximityFileTransferEta";
    import LL from "../../../../../i18n/i18n-svelte";

    interface Props {
        content: Readable<ChatMessageContent>;
        message?: ChatMessage;
        loadingLabel?: string;
        errorLabel?: string;
    }

    let { content, message = undefined, loadingLabel = undefined, errorLabel = undefined }: Props = $props();

    // Without an attachment there is nothing to wait for: shown without a URL, the file is missing.
    const missing = readable<ChatAttachmentStatus>({ state: "error", error: "download" });
    const noDecision = readable<"pending" | "accepted" | "declined">("accepted");
    let consent = $derived(message?.attachment?.consent);
    let status = $derived(message?.attachment?.status ?? missing);
    let decision = $derived(consent?.decision ?? noDecision);
    let errorText = $derived(
        $status.state === "error" && $status.error === "decrypt"
            ? $LL.chat.file.attachmentDecryptError()
            : (errorLabel ?? $LL.chat.file.attachmentDownloadError()),
    );
    let estimatedRemainingTime = $derived(
        $status.state === "loading" && $status.remainingSeconds !== undefined
            ? formatProximityFileTransferRemainingTime($status.remainingSeconds)
            : undefined,
    );
</script>

<div class="text-xs text-white/80 px-2 py-2">
    <!-- Declining is final: the sender leaving afterwards does not turn it into a download error. -->
    {#if $decision === "declined"}
        {$LL.chat.decline()}
    {:else if $status.state === "error"}
        {errorText}
    {:else if consent && $decision === "pending"}
        <div class="truncate font-bold text-white">{$content.body}</div>
        <div class="flex gap-1 mt-1">
            <button
                class="border border-solid border-success text-success hover:bg-success-400/10 rounded text-xs py-1 px-2 m-0"
                data-testid="acceptAttachmentButton"
                onclick={() => consent?.accept()}
            >
                {$LL.chat.accept()}
            </button>
            <button
                class="border border-solid border-danger text-danger hover:bg-danger-400/10 rounded text-xs py-1 px-2 m-0"
                data-testid="declineAttachmentButton"
                onclick={() => consent?.decline()}
            >
                {$LL.chat.decline()}
            </button>
        </div>
    {:else if $status.state === "loading"}
        {loadingLabel ?? $LL.chat.file.loadingAttachment()}
        {#if $status.progress !== undefined}
            {Math.round($status.progress * 100)}%
        {/if}
        {#if estimatedRemainingTime !== undefined}
            · {$LL.chat.file.remainingTime({ time: estimatedRemainingTime })}
        {/if}
    {:else}
        <!-- Ready, yet the message has no URL to show. -->
        {errorText}
    {/if}
</div>

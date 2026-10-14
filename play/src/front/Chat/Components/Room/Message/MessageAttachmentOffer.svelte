<script lang="ts">
    import { readable, type Readable } from "svelte/store";
    import type { ChatAttachmentStatus, ChatMessage, ChatMessageContent } from "../../../Connection/ChatConnection";
    import { formatProximityFileTransferRemainingTime } from "../../../Connection/Proximity/ProximityFileTransferEta";
    import { formatFileSize } from "../../../../Utils/FileSize";
    import LL from "../../../../../i18n/i18n-svelte";
    import { IconPaperclip } from "@wa-icons";

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
    let size = $derived(message?.attachment?.size);
    // Declining is final: the sender leaving afterwards does not turn it into a download error.
    let phase: "declined" | "error" | "offered" | "loading" | "missing" = $derived(
        $decision === "declined"
            ? "declined"
            : $status.state === "error"
              ? "error"
              : consent && $decision === "pending"
                ? "offered"
                : $status.state === "loading"
                  ? "loading"
                  : "missing", // ready, yet the message has no URL to show
    );
    let percent = $derived(
        phase === "loading" && $status.state === "loading" && $status.progress !== undefined
            ? Math.floor($status.progress * 100)
            : undefined,
    );

    function captionFor(currentPhase: typeof phase, currentStatus: ChatAttachmentStatus): string {
        switch (currentPhase) {
            case "declined":
                return $LL.chat.file.recipient.declined();
            case "offered": {
                const hint = $LL.chat.file.acceptToDownload();
                return size !== undefined ? `${formatFileSize(size)} · ${hint}` : hint;
            }
            case "loading": {
                const label = loadingLabel ?? $LL.chat.file.loadingAttachment();
                return currentStatus.state === "loading" && currentStatus.remainingSeconds !== undefined
                    ? `${label} · ${$LL.chat.file.remainingTime({
                          time: formatProximityFileTransferRemainingTime(currentStatus.remainingSeconds),
                      })}`
                    : label;
            }
            default:
                return currentStatus.state === "error" && currentStatus.error === "decrypt"
                    ? $LL.chat.file.attachmentDecryptError()
                    : (errorLabel ?? $LL.chat.file.attachmentDownloadError());
        }
    }
</script>

<div
    class="min-w-[200px] max-w-full overflow-hidden rounded-t-[inherit] bg-white/5 last:rounded-b-[inherit] text-white"
>
    <div class="flex items-center justify-between gap-2 px-2.5 py-2">
        <div class="min-w-0">
            <div class="flex items-center gap-1 text-sm font-bold">
                <IconPaperclip font-size={14} class="shrink-0" />
                <span class="truncate">{$content.body}</span>
            </div>
            <div class="text-xs text-white/70">{captionFor(phase, $status)}</div>
        </div>
        {#if percent !== undefined}
            <span class="shrink-0 text-sm font-bold">{percent}%</span>
        {/if}
    </div>
    {#if percent !== undefined}
        <div
            class="h-1 bg-white/10"
            role="progressbar"
            aria-label={$content.body}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={percent}
        >
            <div class="h-full bg-success transition-[width]" style="width: {percent}%"></div>
        </div>
    {:else if phase === "offered"}
        <div class="flex border-0 border-t border-solid border-white/10 text-xs font-bold">
            <button
                class="m-0 flex-1 rounded-none border-0 border-r border-solid border-white/10 bg-transparent py-2 text-danger-400 hover:bg-white/10"
                data-testid="declineAttachmentButton"
                onclick={() => consent?.decline()}
            >
                {$LL.chat.decline()}
            </button>
            <button
                class="m-0 flex-1 rounded-none border-0 bg-transparent py-2 text-success hover:bg-white/10"
                data-testid="acceptAttachmentButton"
                onclick={() => consent?.accept()}
            >
                {$LL.chat.accept()}
            </button>
        </div>
    {/if}
</div>

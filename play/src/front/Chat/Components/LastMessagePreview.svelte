<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessagePreview } from "../Connection/ChatConnection";
    import LL from "../../../i18n/i18n-svelte";
    import { IconCheck, IconChecks } from "@wa-icons";

    interface Props {
        preview: Readable<ChatMessagePreview | undefined>;
        // In a direct conversation, the sender goes without saying.
        showSender: boolean;
    }

    let { preview, showSender }: Props = $props();
</script>

{#if $preview}
    <span class="flex items-center gap-1 min-w-0 text-sm font-normal text-white/60">
        {#if $preview.readState === "read"}
            <IconChecks
                font-size="14"
                class="shrink-0 text-light-blue"
                aria-label={$LL.chat.readReceipts.read()}
                data-testid="previewReadState"
            />
        {:else if $preview.readState === "sent"}
            <IconCheck
                font-size="14"
                class="shrink-0"
                aria-label={$LL.chat.readReceipts.sent()}
                data-testid="previewReadState"
            />
        {/if}
        <span class="block truncate">
            {#if showSender && $preview.senderName}<span class="text-white/80">{$preview.senderName}</span> ·&#32;{/if}{$preview.body}
        </span>
    </span>
{/if}

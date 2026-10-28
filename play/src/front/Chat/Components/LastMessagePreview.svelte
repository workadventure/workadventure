<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessagePreview } from "../Connection/ChatConnection";

    interface Props {
        preview: Readable<ChatMessagePreview | undefined>;
        // In a direct conversation, the sender goes without saying.
        showSender: boolean;
    }

    let { preview, showSender }: Props = $props();
</script>

{#if $preview}
    <span class="block truncate text-sm font-normal text-white/60">
        {#if showSender && $preview.senderName}<span class="text-white/80">{$preview.senderName}</span> ·&#32;{/if}{$preview.body}
    </span>
{/if}

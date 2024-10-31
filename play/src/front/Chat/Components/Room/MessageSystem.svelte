<script lang="ts">
    import { ChatMessage } from "../../Connection/ChatConnection";

    export let message: Pick<ChatMessage, "date" | "content">;

    const { date, content } = message;
</script>

<div class="message tw-group tw-flex tw-flex-col tw-justify-center tw-items-center tw-mb-3">
    <span
        class="tw-px-3 tw-py-1.5 tw-m-0 tw-text-xs tw-text-center tw-border tw-border-solid tw-border-white/10 tw-rounded-2xl"
    >
        <span class="messageTextBody tw-text-white/80 group-hover:tw-text-white/100">
            {$content.body}
        </span>
        {#if date}<span class="tw-text-white/40"
                >{("0" + date.getHours().toString()).slice(-2)}:{("0" + date.getMinutes().toString()).slice(-2)}</span
            >{/if}
    </span>
</div>

<style>
    .message {
        overflow-wrap: anywhere;
    }
</style>

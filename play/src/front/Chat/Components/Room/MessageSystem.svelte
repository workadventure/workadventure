<script lang="ts">
    import { ChatMessage } from "../../Connection/ChatConnection";

    export let message: Pick<ChatMessage, "date" | "content">;

    const { date, content } = message;
</script>

<div class="message tw-rounded-2xl tw-p-2">
    <p class="tw-p-0 tw-m-0 tw-text-xs tw-italic tw-text-center">
        {$content.body}
        {#if date}<span class="tw-text-white/50"
                >{("0" + date.getHours().toString()).slice(-2)}:{("0" + date.getSeconds().toString()).slice(-2)}</span
            >{/if}
    </p>
</div>

<style>
    .message {
        overflow-wrap: anywhere;
    }
</style>

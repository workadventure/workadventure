<script lang="ts">
    import { Readable } from "svelte/store";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";

    export let content:Readable<ChatMessageContent>
</script>

{#if $content.url !== undefined}
    <video controls class="tw-w-full">
        <source src={$content.url} />
    </video>
{/if}




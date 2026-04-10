<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessageContent } from "../../../Connection/ChatConnection";

    export let content: Readable<ChatMessageContent>;
</script>

{#if $content.url !== undefined}
    <!-- svelte-ignore a11y-media-has-caption -->
    <video controls class="w-full block rounded">
        <source src={$content.url} />
    </video>
{/if}

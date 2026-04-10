<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessageContent } from "../../../Connection/ChatConnection";

    export let content: Readable<ChatMessageContent>;
</script>

<p class="p-0 m-0 text-xs">
    {$content.body}
</p>

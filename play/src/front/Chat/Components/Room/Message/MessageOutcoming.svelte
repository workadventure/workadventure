<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessageContent } from "../../../Connection/ChatConnection";

    interface Props {
        content: Readable<ChatMessageContent>;
    }

    let { content }: Props = $props();
</script>

<p class="p-0 m-0 text-xs italic">
    {$content.body}
</p>

<script lang="ts">
    import { IconPaperclip } from "@tabler/icons-svelte";
    import { Readable } from "svelte/store";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";

    export let content:Readable<ChatMessageContent>
</script>

<a href={$content.url} download class="tw-text-xs">
    <IconPaperclip />
    {$content.body}
</a>

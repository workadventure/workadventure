<script lang="ts">
    import { Readable } from "svelte/store";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";
    import { IconPaperclip } from "../../../../Components/Icons";

    export let content: Readable<ChatMessageContent>;
</script>

<a href={$content.url} download class="tw-text-xs">
    <IconPaperclip />
    {$content.body}
</a>

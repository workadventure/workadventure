<script lang="ts">
    import { Readable } from "svelte/store";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";

    export let content:Readable<ChatMessageContent>

</script>

<p class="tw-p-0 tw-m-0 tw-text-xs">
    {$content.body}
</p>

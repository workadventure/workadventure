<script lang="ts">
    import { Readable } from "svelte/store";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";

    export let content:Readable<ChatMessageContent>
</script>

<audio controls src={$content.url} class="tw-h-10 tw-w-48"></audio>



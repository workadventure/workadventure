<script lang="ts">
    import { Readable } from "svelte/store";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";

    export let content:Readable<ChatMessageContent>
</script>

<img class="tw-w-full tw-object-contain tw-max-h-52" src={$content.url} alt={$content.body} />

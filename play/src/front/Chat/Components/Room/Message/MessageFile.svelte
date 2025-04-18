<script lang="ts">
    import { Readable } from "svelte/store";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";
    import { IconInbox } from "@wa-icons";

    export let content: Readable<ChatMessageContent>;
</script>

<a
    href={$content.url}
    download
    class="flex items-center text-white hover:bg-white/10 px-2 py-2 rounded-md hover:no-underline hover:text-white font-bold cursor-pointer"
>
    <div class="flex items-center justify-center p-2 bg-white/10 rounded-full">
        <IconInbox font-size="20" />
    </div>
    <div class="px-4 truncate">
        {$content.body}
    </div>
</a>

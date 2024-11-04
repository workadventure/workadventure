<script lang="ts">
    import { Readable } from "svelte/store";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";
    import { IconInbox } from "@wa-icons";

    export let content: Readable<ChatMessageContent>;
</script>

<a
    href={$content.url}
    download
    class="tw-flex tw-items-center tw-text-white hover:tw-bg-white/10 tw-px-4 tw-py-2 tw-rounded-full hover:tw-no-underline hover:tw-text-white tw-font-bold tw-cursor-pointer"
>
    <div class="tw-flex tw-items-center tw-justify-center tw-p-2 tw-bg-white/10 tw-rounded-full">
        <IconInbox font-size="20" />
    </div>
    <div class="tw-px-4 tw-truncate">
        {$content.body}
    </div>
</a>

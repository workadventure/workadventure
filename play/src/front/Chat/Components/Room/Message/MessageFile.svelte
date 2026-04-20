<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessageContent } from "../../../Connection/ChatConnection";
    import LL from "../../../../../i18n/i18n-svelte";
    import { IconInbox } from "@wa-icons";

    export let content: Readable<ChatMessageContent>;
</script>

{#if $content.mediaState === "loading"}
    <div class="text-xs text-white/80 px-2 py-2">{$LL.chat.file.loadingAttachment()}</div>
{:else if $content.mediaState === "error"}
    <div class="text-xs text-white/80 px-2 py-2">
        {$content.mediaErrorKind === "decrypt"
            ? $LL.chat.file.attachmentDecryptError()
            : $LL.chat.file.attachmentDownloadError()}
    </div>
{:else if $content.url !== undefined}
    <a
        href={$content.url}
        download={$content.body}
        class="flex items-center text-white hover:bg-white/10 px-2 py-2 rounded-md hover:no-underline hover:text-white font-bold cursor-pointer"
    >
        <div class="flex items-center justify-center p-2 bg-white/10 rounded-full">
            <IconInbox font-size="20" />
        </div>
        <div class="px-4 truncate">
            {$content.body}
        </div>
    </a>
{:else}
    <div class="text-xs text-white/80 px-2 py-2">{$LL.chat.file.attachmentDownloadError()}</div>
{/if}

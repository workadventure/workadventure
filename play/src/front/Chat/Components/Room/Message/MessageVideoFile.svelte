<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessageContent } from "../../../Connection/ChatConnection";
    import LL from "../../../../../i18n/i18n-svelte";

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
    <!-- svelte-ignore a11y-media-has-caption -->
    <video controls class="w-full block rounded">
        <source src={$content.url} />
    </video>
{/if}

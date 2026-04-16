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
    <audio controls src={$content.url} class="max-w-full min-w-96 block p-2" />
{/if}

<style>
    audio::-webkit-media-controls-panel {
        background-color: #d3d8f9;
        -moz-border-radius: 1px !important;
        -webkit-border-radius: 1px !important;
        border-radius: 1px !important;
    }

    audio::-webkit-media-controls-mute-button,
    audio::-webkit-media-controls-play-button,
    audio::-webkit-media-controls-current-time-display,
    audio::-webkit-media-controls-time-remaining-display,
    audio::-webkit-media-controls-timeline {
        color: #1b2a41;
        -moz-border-radius: 1px !important;
        -webkit-border-radius: 1px !important;
        border-radius: 1px !important;
    }
</style>

<script lang="ts">
    import { Readable } from "svelte/store";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";

    export let content: Readable<ChatMessageContent>;
</script>

<audio controls src={$content.url} class="max-w-full min-w-96 block p-2" />

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
        color: #6e1946;
        -moz-border-radius: 1px !important;
        -webkit-border-radius: 1px !important;
        border-radius: 1px !important;
    }
</style>

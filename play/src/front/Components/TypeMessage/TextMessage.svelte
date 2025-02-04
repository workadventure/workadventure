<script lang="ts">
    import { fly, fade } from "svelte/transition";
    import { QuillDeltaToHtmlConverter } from "quill-delta-to-html";
    import type { Message } from "../../Stores/TypeMessageStore/MessageStore";
    import { textMessageStore } from "../../Stores/TypeMessageStore/TextMessageStore";

    /* eslint-disable svelte/no-at-html-tags */

    export let message: Message;

    const content = JSON.parse(message.text);
    const converter = new QuillDeltaToHtmlConverter(content.ops, { inlineStyles: true });

    function closeTextMessage() {
        textMessageStore.clearMessageById(message.id);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeTextMessage();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} />

<div
    class="main-text-message bg-dark-purple/95 rounded absolute flex w-3/5 m-auto py-3 pl-5 pr-2 max-h-64 left-0 right-0 pointer-events-auto"
    in:fly={{ x: -1000, duration: 500, delay: 250 }}
    out:fade={{ duration: 150 }}
>
    <div class="content-text-message flex text-white max-h-60 w-full overflow-auto mt-7 mr-6">
        {@html converter.convert()}
    </div>
    <button type="button" class="btn close-window !right-1" on:click|preventDefault={closeTextMessage}>&times;</button>
</div>

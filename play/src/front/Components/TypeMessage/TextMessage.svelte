<script lang="ts">
    import { fly } from "svelte/transition";
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
    class="main-text-message tw-bg-dark-purple/95 tw-absolute tw-flex tw-m-auto tw-max-h-64 tw-left-0 tw-right-0 tw-pointer-events-auto tw-w-fit tw-max-w-screen-md tw-rounded-2xl"
    transition:fly={{ x: 1000, duration: 500 }}
>
    <div
        class="content-text-message tw-flex tw-text-white tw-max-h-60 tw-w-full tw-overflow-auto tw-mb-3 tw-mt-7 tw-ml-7 tw-mr-12"
    >
        {@html converter.convert()}
    </div>
    <button type="button" class="btn close-window !tw-right-1" on:click|preventDefault={closeTextMessage}
        >&times;</button
    >
</div>

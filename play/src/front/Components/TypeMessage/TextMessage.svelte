<script lang="ts">
    import { fade } from "svelte/transition";
    import { QuillDeltaToHtmlConverter } from "quill-delta-to-html";
    import type { Message } from "../../Stores/TypeMessageStore/MessageStore";
    import { textMessageStore } from "../../Stores/TypeMessageStore/TextMessageStore";
    import ButtonClose from "../Input/ButtonClose.svelte";

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
    class="main-text-message bg-contrast/85 rounded absolute backdrop-blur-md flex gap-3 w-3/5 m-auto py-3 pl-5 pr-2 max-h-64 left-0 right-0 shadow-xl  pointer-events-auto animate-bounce-in"
    out:fade={{ duration: 150 }}
>
    <div class="icon mt-3 text-white text-xl">💬</div>
    <div class="content-text-message flex text-white max-h-60 w-full overflow-auto  mr-6">
        {@html converter.convert()}
    </div>
    <ButtonClose on:click={closeTextMessage} />
</div>

<style>
    @keyframes bounce-in {
        0% {
            transform: scale(0.5);
            opacity: 0;
        }
        60% {
            transform: scale(1.05);
            opacity: 1;
        }
        100% {
            transform: scale(1);
        }
    }
    .animate-bounce-in {
        animation: bounce-in 0.5s ease-out;
    }
</style>

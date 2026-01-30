<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let message: string;
    export let inputClass = "";
    export let dataText = "";
    export let dataTestid = "";
    export let messageInput: HTMLDivElement;
    export let onKeyDown: ((event: KeyboardEvent) => void) | undefined = undefined;
    export let onInput = () => {};
    export let disabled = false;
    export let focusin = (event: FocusEvent) => {
        console.info("Not used focusin", event);
    };
    export let focusout = (event: FocusEvent) => {
        console.info("Not used focusout", event);
    };

    const dispatch = createEventDispatcher<{
        pasteFiles: FileList;
    }>();

    let isComposing = false;

    function onCompositionStart() {
        isComposing = true;
    }

    function onCompositionEnd() {
        // Defer to next tick: some browsers fire keydown(Enter) after compositionend when the user
        // confirms IME conversion. If we set isComposing = false here immediately, that Enter would
        // be treated as "send" instead of "confirm"; deferring keeps the confirming Enter ignored.
        setTimeout(() => {
            isComposing = false;
        }, 0);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" && (event.isComposing || isComposing)) {
            return;
        }
        if (onKeyDown) {
            onKeyDown(event);
        }
    };
    function onPasteHandler(event: ClipboardEvent) {
        if (event.clipboardData?.files && event.clipboardData.files.length > 0) {
            dispatch("pasteFiles", event.clipboardData.files);
        }

        if (!event.clipboardData) return;

        const text = event.clipboardData.getData("text");

        insertTextAtCursor(text);
        message = messageInput.innerHTML;
        event.preventDefault();
    }
    function insertTextAtCursor(text: string) {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) {
            return;
        }

        const range = selection.getRangeAt(0);
        range.deleteContents();

        const lines = text.split("\n").reverse();
        let textNode: Text | undefined;
        let lastBrNode: HTMLBRElement | undefined;
        for (const line of lines) {
            const br = document.createElement("br");
            range.insertNode(br);
            if (textNode === undefined) {
                lastBrNode = br;
            }
            textNode = document.createTextNode(line);
            // Insertion in a range object is done in reverse order.
            range.insertNode(textNode);
        }

        selection.removeAllRanges();
        selection.addRange(range);
        // Move the cursor to the end of the inserted text
        selection.collapseToEnd();
        // The code above is adding on purpose an additional <br> at the end of the message.
        // This way, we can scroll to the end of the message.
        // Once we have scrolled, we can remove the last <br> tag
        lastBrNode?.scrollIntoView();
        lastBrNode?.remove();
    }
</script>

{#if !disabled}
    <div
        data-testid={dataTestid}
        bind:innerHTML={message}
        contenteditable="true"
        bind:this={messageInput}
        on:keydown={handleKeyDown}
        on:compositionstart={onCompositionStart}
        on:compositionend={onCompositionEnd}
        on:input={onInput}
        on:paste={onPasteHandler}
        on:focusin={focusin}
        on:focusout={focusout}
        class={inputClass}
        data-text={dataText}
        role="textbox"
        tabindex="0"
        dir="auto"
        lang=""
    />
{:else}
    <div
        data-testid={dataTestid}
        bind:innerHTML={message}
        contenteditable="false"
        bind:this={messageInput}
        class={`${inputClass} opacity-70/50 cursor-not-allowed`}
    />
{/if}

<style lang="scss">
    .message-input::before {
        content: attr(data-text);
        color: rgba(211, 211, 211, 0.5);
        pointer-events: none;
        z-index: 0;
        transition: opacity 0.3s ease;
    }

    .message-input:focus::before,
    .message-input:not(:empty)::before {
        content: "";
    }
</style>

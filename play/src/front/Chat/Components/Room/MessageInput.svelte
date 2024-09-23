<script lang="ts">
    import { onDestroy } from "svelte";
    import { ChatRoom } from "../../Connection/ChatConnection";
    import { selectedChatMessageToReply } from "../../Stores/ChatStore";
    import { getChatEmojiPicker } from "../../EmojiPicker";
    import LL from "../../../../i18n/i18n-svelte";
    import MessageFileInput from "./Message/MessageFileInput.svelte";
    import { IconCircleX, IconMoodSmile, IconSend } from "@wa-icons";

    export let room: ChatRoom;

    let message = "";
    let messageInput: HTMLDivElement;
    let emojiButtonRef: HTMLButtonElement;
    let stopTypingTimeOutID: undefined | ReturnType<typeof setTimeout>;
    let typingTimeoutID: undefined | ReturnType<typeof setTimeout>;
    const TYPING_TIMEOUT = 3000;
    const TYPING_DEBOUNCE_DELAY = 20000;
    let hasSentFirstTypingNotification = false;

    const selectedChatChatMessageToReplyUnsubscriber = selectedChatMessageToReply.subscribe((chatMessage) => {
        if (chatMessage !== null) {
            messageInput.focus();
        }
    });

    function startTypingAndSetTimeout() {
        room.startTyping()
            .then(() => {
                stopTypingTimeOutID = setTimeout(() => {
                    room.stopTyping().catch((error) => console.error(error));
                    if (typingTimeoutID) clearTimeout(typingTimeoutID);
                }, TYPING_TIMEOUT);
            })
            .catch((error) => console.error(error));
    }
    function sendMessageOrEscapeLine(keyDownEvent: KeyboardEvent) {
        if (stopTypingTimeOutID) clearTimeout(stopTypingTimeOutID);

        if (keyDownEvent.key === "Enter" || message.trim().length === 0 || message == undefined) {
            if (stopTypingTimeOutID) clearTimeout(stopTypingTimeOutID);
            if (typingTimeoutID) clearTimeout(typingTimeoutID);
            hasSentFirstTypingNotification = false;
            room.stopTyping().catch((error) => console.error(error));
        }

        if (!hasSentFirstTypingNotification) {
            startTypingAndSetTimeout();
            hasSentFirstTypingNotification = true;
        } else {
            startTypingWithDebounce();
        }

        if (keyDownEvent.key === "Enter" && !keyDownEvent.shiftKey) {
            keyDownEvent.preventDefault();
        }
        if (keyDownEvent.key === "Enter" && message.trim().length !== 0) {
            // message contains HTML tags. Actually, the only tags we allow are for the new line, ie. <br> tags.
            // We can turn those back into carriage returns.
            const messageToSend = message.replace(/<br>/g, "\n");
            sendMessage(messageToSend);
            return;
        }
        if (keyDownEvent.key === "Enter" && keyDownEvent.shiftKey) {
            return;
        }
    }

    function startTypingWithDebounce() {
        if (typingTimeoutID) clearTimeout(typingTimeoutID);
        typingTimeoutID = setTimeout(() => {
            startTypingAndSetTimeout();
        }, TYPING_DEBOUNCE_DELAY);
    }

    function sendMessage(messageToSend: string) {
        room?.sendMessage(messageToSend);
        messageInput.innerText = "";
        message = "";
        hasSentFirstTypingNotification = false;
        if (typingTimeoutID) clearTimeout(typingTimeoutID);
        if (stopTypingTimeOutID) {
            clearTimeout(stopTypingTimeOutID);
        }
    }

    function unselectChatMessageToReply() {
        selectedChatMessageToReply.set(null);
    }

    function onInputHandler() {
        if (message == "" || message == undefined) {
            if (stopTypingTimeOutID) clearTimeout(stopTypingTimeOutID);
            room.stopTyping().catch((error) => console.error(error));
        }
    }

    onDestroy(() => {
        selectedChatChatMessageToReplyUnsubscriber();
    });

    const emojiPicker = getChatEmojiPicker({ right: "0" });
    emojiPicker.on("emoji", ({ emoji }) => {
        message += emoji;
    });

    function openCloseEmojiPicker() {
        emojiPicker.isPickerVisible() ? emojiPicker.hidePicker() : emojiPicker.showPicker(emojiButtonRef);
    }

    function onPasteHandler(event: ClipboardEvent) {
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

    $: quotedMessageContent = $selectedChatMessageToReply?.content;
</script>

{#if $selectedChatMessageToReply !== null}
    <div class="tw-flex tw-p-2 tw-items-center tw-gap-1">
        <p class="tw-bg-brand-blue tw-rounded-md tw-p-2 tw-text-xs tw-m-0" style:overflow-wrap="anywhere">
            {$quotedMessageContent?.body}
        </p>
        <button class="tw-p-0 tw-m-0" on:click={unselectChatMessageToReply}>
            <IconCircleX />
        </button>
    </div>
{/if}
<div
    class="tw-flex tw-items-center tw-py-1 tw-gap-1 tw-border tw-border-solid tw-rounded-xl tw-pr-1 tw-border-light-purple"
>
    <div
        data-testid="messageInput"
        bind:innerHTML={message}
        contenteditable="true"
        bind:this={messageInput}
        on:keydown={sendMessageOrEscapeLine}
        on:input={onInputHandler}
        on:paste={onPasteHandler}
        class=" message-input !tw-m-0 tw-px-2 tw-max-h-36 tw-overflow-auto tw-w-full tw-h-full tw-rounded-xl wa-searchbar tw-block tw-text-white placeholder:tw-text-sm  tw-border-light-purple tw-border !tw-bg-transparent tw-resize-none tw-border-none tw-outline-none tw-shadow-none focus:tw-ring-0"
        data-text={$LL.chat.enter()}
        role="textbox"
        tabindex="0"
        dir="auto"
    />
    <button
        class="disabled:tw-opacity-30 disabled:!tw-cursor-none tw-p-0 tw-m-0"
        bind:this={emojiButtonRef}
        on:click={openCloseEmojiPicker}
    >
        <IconMoodSmile font-size={18} />
    </button>
    <MessageFileInput {room} />
    <button
        data-testid="sendMessageButton"
        class="disabled:tw-opacity-30 disabled:!tw-cursor-none disabled:tw-text-white tw-p-0 tw-m-0 tw-text-secondary"
        disabled={message.trim().length === 0}
        on:click={() => sendMessage(message)}
    >
        <IconSend font-size={20} />
    </button>
</div>

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

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
    const TYPINT_TIMEOUT = 10000;

    const selectedChatChatMessageToReplyUnsubscriber = selectedChatMessageToReply.subscribe((chatMessage) => {
        if (chatMessage !== null) {
            messageInput.focus();
        }
    });

    function sendMessageOrEscapeLine(keyDownEvent: KeyboardEvent) {
        if (stopTypingTimeOutID) clearTimeout(stopTypingTimeOutID);
        room.startTyping()
            .then(() => {
                stopTypingTimeOutID = setTimeout(() => {
                    room.stopTyping().catch((error) => console.error(error));
                    stopTypingTimeOutID = undefined;
                }, TYPINT_TIMEOUT);
            })
            .catch((error) => console.error(error));

        if (keyDownEvent.key === "Enter" || message == "" || message == undefined) {
            if (stopTypingTimeOutID) clearTimeout(stopTypingTimeOutID);
            room.stopTyping().catch((error) => console.error(error));
        }

        if (keyDownEvent.key === "Enter" && keyDownEvent.shiftKey) {
            return;
        }
        if (keyDownEvent.key === "Enter" && !keyDownEvent.shiftKey) {
            keyDownEvent.preventDefault();
        }
        if (keyDownEvent.key === "Enter" && message.trim().length !== 0) {
            sendMessage(message);
            return;
        }
    }

    function sendMessage(messageToSend: string) {
        room?.sendMessage(messageToSend);
        messageInput.innerText = "";
        message = "";
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
        event.preventDefault(); // Prevent the default paste action

        if (!event.clipboardData) return;

        const text = event.clipboardData.getData("text");

        document.execCommand("insertText", false, text);
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
<div class="tw-flex tw-items-center tw-gap-1 tw-border tw-border-solid tw-rounded-xl tw-pr-1 tw-border-light-purple">
    <div
        data-testid="messageInput"
        bind:textContent={message}
        contenteditable="true"
        bind:this={messageInput}
        on:keydown={sendMessageOrEscapeLine}
        on:input={onInputHandler}
        on:paste={onPasteHandler}
        class="!tw-m-0 tw-px-2 tw-max-h-36 tw-overflow-auto tw-w-full tw-h-full tw-rounded-xl wa-searchbar tw-block tw-text-white placeholder:tw-text-sm  tw-border-light-purple tw-border !tw-bg-transparent tw-resize-none tw-border-none tw-outline-none tw-shadow-none focus:tw-ring-0"
        placeholder={$LL.chat.enter()}
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

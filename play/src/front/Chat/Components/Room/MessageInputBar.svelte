<script lang="ts">
    import { onDestroy } from "svelte";
    import { ChatRoom } from "../../Connection/ChatConnection";
    import { selectedChatMessageToReply } from "../../Stores/ChatStore";
    import { getChatEmojiPicker } from "../../EmojiPicker";
    import LL from "../../../../i18n/i18n-svelte";
    import { ProximityChatRoom } from "../../Connection/Proximity/ProximityChatRoom";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import MessageFileInput from "./Message/MessageFileInput.svelte";
    import MessageInput from "./MessageInput.svelte";
    import { IconCircleX, IconMoodSmile, IconSend } from "@wa-icons";

    export let room: ChatRoom;

    let message = "";
    let messageInput: HTMLDivElement;
    let emojiButtonRef: HTMLButtonElement;
    let stopTypingTimeOutID: undefined | ReturnType<typeof setTimeout>;
    let files: { id: string; file: File }[] = [];
    let filesPreview: { id: string; size: number; name: string; type: string; url: FileReader["result"] }[] = [];
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
            // message contains HTML tags. Actually, the only tags we allow are for the new line, ie. <br> tags.
            // We can turn those back into carriage returns.
            const messageToSend = message.replace(/<br>/g, "\n");
            sendMessage(messageToSend);
        }
        if (keyDownEvent.key === "Enter" && files && files.length > 0) {
            if (files && !(room instanceof ProximityChatRoom)) {
                const fileList: FileList = files.reduce((fileListAcc, currentFile) => {
                    fileListAcc.items.add(currentFile.file);
                    return fileListAcc;
                }, new DataTransfer()).files;

                room.sendFiles(fileList).catch((error) => console.error(error));
                files = [];
                filesPreview = [];
            }
            return;
        }
    }

    function sendMessage(messageToSend: string) {
        const decoder = document.createElement("div");
        decoder.innerHTML = messageToSend;
        const decodedMessage = decoder.textContent || decoder.innerText;

        room?.sendMessage(decodedMessage);
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

    export function handleFiles(event: CustomEvent<FileList>) {
        const newFiles = [...event.detail].map((file) => ({ id: window.crypto.randomUUID(), file }));
        files = [...files, ...newFiles];
        addToPreviews(newFiles);
    }

    function addToPreviews(files: { id: string; file: File }[]) {
        Array.from(files).forEach((file) => {
            const reader = new FileReader();

            reader.onload = () => {
                filesPreview = [
                    ...filesPreview,
                    {
                        id: file.id,
                        name: file.file.name,
                        type: file.file.type,
                        size: file.file.size,
                        url: reader.result,
                    },
                ];
            };
            reader.readAsDataURL(file.file);
        });
    }

    function deleteFile(id: string) {
        files = files.filter((file) => file.id !== id);
        filesPreview = filesPreview.filter((filePreview) => filePreview.id !== id);
    }

    function formatBytes(bytes: number) {
        if (bytes === 0) return "0 Bytes";
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
    }

    function focusin(event: FocusEvent) {
        event.stopImmediatePropagation();
        event.preventDefault();
        chatInputFocusStore.set(true);
    }
    function focusout(event: FocusEvent) {
        event.stopImmediatePropagation();
        event.preventDefault();
        chatInputFocusStore.set(false);
    }

    $: quotedMessageContent = $selectedChatMessageToReply?.content;
</script>

{#if $selectedChatMessageToReply !== null}
    <div class="tw-flex tw-py-2 tw-px-3 tw-items-center tw-gap-2 tw-relative tw-bg-contrast/50 tw-absolute">
        <p
            class="tw-bg-contrast-800 tw-rounded-md tw-p-2 tw-text-sm tw-m-0 tw-truncate tw-w-full "
            style:overflow-wrap="anywhere"
        >
            {$quotedMessageContent?.body}
        </p>
        <button class="tw-p-0 tw-m-0" on:click={unselectChatMessageToReply}>
            <IconCircleX />
        </button>
    </div>
{/if}

{#if files.length > 0 && !(room instanceof ProximityChatRoom)}
    <div class="tw-w-full tw-pt-2 !tw-bg-blue-300/10 tw-rounded-xl">
        <div class="tw-flex tw-p-2  tw-gap-2 tw-w-full tw-overflow-x-scroll tw-overflow-y-hidden tw-rounded-lg ">
            {#each filesPreview as preview (preview.id)}
                <div
                    class="tw-relative tw-content-center tw-h-[15rem] tw-w-[15rem]  tw-min-h-[15rem] tw-min-w-[15rem] tw-overflow-hidden tw-rounded-xl tw-backdrop-opacity-10"
                >
                    <button class="tw-absolute tw-right-1 tw-top-1 !tw-pr-0" on:click={() => deleteFile(preview.id)}>
                        <IconCircleX class="hover:tw-cursor-pointer hover:tw-opacity-10" font-size="24" />
                    </button>
                    {#if preview.type.includes("image") && typeof preview.url === "string"}
                        <img class="tw-w-full tw-h-full" src={preview.url} alt={preview.name} />
                    {:else}
                        <div class="tw-text-center">
                            {preview.name}
                        </div>
                        <div class="tw-absolute tw-bottom-0 tw-left-0">
                            {formatBytes(preview.size)}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/if}
<div
    class="tw-flex tw-w-full tw-flex-none tw-items-center tw-border tw-border-solid tw-border-b-0 tw-border-x-0 tw-border-t-1 tw-border-white/10 tw-bg-contrast/50"
>
    <MessageInput
        onKeyDown={sendMessageOrEscapeLine}
        onInput={onInputHandler}
        on:pasteFiles={handleFiles}
        {focusin}
        {focusout}
        bind:message
        bind:messageInput
        inputClass="message-input tw-flex-grow !tw-m-0 tw-px-5 tw-py-2.5 tw-max-h-36 tw-overflow-auto  tw-h-full tw-rounded-xl wa-searchbar tw-block tw-text-white placeholder:tw-text-base tw-border-light-purple tw-border !tw-bg-transparent tw-resize-none tw-border-none tw-outline-none tw-shadow-none focus:tw-ring-0"
        dataText={$LL.chat.enter()}
        dataTestid="messageInput"
    />
    {#if message.trim().length === 0}
        <button
            class="disabled:tw-opacity-30 disabled:!tw-cursor-none tw-p-0 tw-m-0 tw-h-11 tw-w-11 tw-flex tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-none"
            bind:this={emojiButtonRef}
            on:click={openCloseEmojiPicker}
        >
            <IconMoodSmile font-size={18} />
        </button>

        {#if gameManager.getCurrentGameScene().room.isChatUploadEnabled}
            <MessageFileInput {room} />
        {/if}
    {:else}
        <button
            data-testid="sendMessageButton"
            class="disabled:tw-opacity-30 disabled:!tw-cursor-none disabled:tw-text-white tw-py-0 tw-px-3 tw-m-0 tw-bg-secondary tw-h-full tw-rounded-none"
            disabled={message.trim().length === 0 && files.length === 0}
            on:click={() => sendMessage(message)}
        >
            <IconSend />
        </button>
    {/if}
</div>

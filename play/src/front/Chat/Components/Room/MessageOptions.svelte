<script lang="ts">
    import { IconArrowBackUp, IconArrowDown, IconMoodSmile, IconPencil, IconTrash } from "@tabler/icons-svelte";
    import { ChatMessage } from "../../Connection/ChatConnection";
    import { selectedChatMessageToEdit, selectedChatMessageToReply } from "../../Stores/ChatStore";
    import { getChatEmojiPicker } from "../../EmojiPicker";


    export let message: ChatMessage;
    export let messageRef: HTMLDivElement;


    function replyToMessage() {
        selectedChatMessageToReply.set(message);
    }

    function removeMessage() {
        message.remove();
    }

    function selectMessageToEdit() {
        selectedChatMessageToEdit.set(message);
    }

    const emojiPicker = getChatEmojiPicker();

    emojiPicker.on("emoji", ({ emoji }) => {
        message.addReaction(emoji).catch(error => console.error(error));
    });

    function openCloseEmojiPicker() {
        emojiPicker.isPickerVisible() ? emojiPicker.hidePicker() : emojiPicker.showPicker(messageRef);
    }

    const { content, isMyMessage, type } = message;
</script>

<div class="tw-flex tw-flex-row tw-gap-1 tw-items-center">
    {#if message.type !== "text"}
        <a href={$content.url} download={$content.body} class="tw-p-0 tw-m-0 tw-text-white hover:tw-text-white"
           target="_blank">
            <IconArrowDown size={16} class="hover:tw-cursor-pointer hover:tw-text-secondary" />
        </a>
    {/if}
    <button class="tw-p-0 tw-m-0 hover:tw-text-secondary" on:click={replyToMessage}>
        <IconArrowBackUp size={16} />
    </button>
    <button class="tw-p-0 tw-m-0 hover:tw-text-secondary" on:click={openCloseEmojiPicker}>
        <IconMoodSmile size={16} />
    </button>
    {#if isMyMessage && type === "text" }
        <button class="tw-p-0 tw-m-0 hover:tw-text-secondary" on:click={selectMessageToEdit}>
            <IconPencil size={16} />
        </button>
    {/if}
    <button class="tw-p-0 tw-m-0 hover:tw-text-secondary" on:click={removeMessage}>
        <IconTrash size={16} />
    </button>
</div>

<script lang="ts">
    import { ChatMessage } from "../../Connection/ChatConnection";
    import { selectedChatMessageToEdit, selectedChatMessageToReply } from "../../Stores/ChatStore";
    import EmojiButton from "./EmojiButton.svelte";
    import { IconArrowBackUp, IconArrowDown, IconPencil, IconTrash } from "@wa-icons";

    export let message: ChatMessage;

    function replyToMessage() {
        selectedChatMessageToReply.set(message);
    }

    function removeMessage() {
        message.remove();
    }

    function selectMessageToEdit() {
        selectedChatMessageToEdit.set(message);
    }

    function addReaction(event: CustomEvent<string>) {
        message.addReaction(event.detail).catch((error) => console.error(error));
    }

    const { content, isMyMessage, type, canDelete } = message;
</script>

<div class="flex flex-row gap-1 items-center">
    {#if message.type !== "text"}
        <a
            href={$content.url}
            download={$content.body}
            class="p-0 m-0 text-white/50 hover:text-white transition-all"
            target="_blank"
        >
            <IconArrowDown font-size={16} class="hover:cursor-pointer" />
        </a>
    {/if}
    <button
        class="p-0 m-0 text-white/50 hover:text-white transition-all hover:cursor-pointer"
        data-testid="replyToMessageButton"
        on:click={replyToMessage}
    >
        <IconArrowBackUp font-size={16} />
    </button>
    <EmojiButton on:change={addReaction} />
    {#if isMyMessage && type === "text"}
        <button
            class="p-0 m-0 text-white/50 hover:text-white transition-all hover:cursor-pointer"
            data-testid="editMessageButton"
            on:click={selectMessageToEdit}
        >
            <IconPencil font-size={16} />
        </button>
    {/if}
    {#if $canDelete}
        <button
            class="p-0 m-0 text-white/50 hover:text-white transition-all hover:cursor-pointer"
            data-testid="removeMessageButton"
            on:click={removeMessage}
        >
            <IconTrash font-size={16} />
        </button>
    {/if}
</div>

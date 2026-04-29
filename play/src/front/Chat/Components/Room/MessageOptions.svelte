<script lang="ts">
    import type { ChatMessage } from "../../Connection/ChatConnection";
    import LL from "../../../../i18n/i18n-svelte";
    import { selectedChatMessageToEdit, selectedChatMessageToReply } from "../../Stores/ChatStore";
    import EmojiButton from "./EmojiButton.svelte";
    import { IconArrowBackUp, IconArrowDown, IconMessageCircle2, IconPencil, IconTrash } from "@wa-icons";

    export let message: ChatMessage;
    export let messageRef: HTMLDivElement | undefined;
    export let onOpenThread: (() => Promise<void>) | undefined = undefined;

    function replyToMessage() {
        selectedChatMessageToReply.set(message);
    }

    async function openThread() {
        await onOpenThread?.();
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
            class="p-0 m-0 text-white/50 hover:text-white transition-all flex"
            target="_blank"
        >
            <IconArrowDown font-size={16} class="hover:cursor-pointer" />
        </a>
    {/if}
    <button
        class="p-0 m-0 text-white/50 hover:text-white transition-all hover:cursor-pointer flex"
        data-testid="replyToMessageButton"
        on:click={replyToMessage}
    >
        <IconArrowBackUp font-size={16} />
    </button>
    {#if message.openThread}
        <button
            class="p-0 m-0 text-white/50 hover:text-white transition-all hover:cursor-pointer flex"
            data-testid="openThreadButton"
            title={$LL.chat.thread.openThreadButtonTitle()}
            on:click={openThread}
        >
            <IconMessageCircle2 font-size={16} />
        </button>
    {/if}
    <EmojiButton on:change={addReaction} {messageRef} />
    {#if isMyMessage && type === "text"}
        <button
            class="p-0 m-0 text-white/50 hover:text-white transition-all hover:cursor-pointer flex"
            data-testid="editMessageButton"
            on:click={selectMessageToEdit}
        >
            <IconPencil font-size={16} />
        </button>
    {/if}
    {#if $canDelete}
        <button
            class="p-0 m-0 text-white/50 hover:text-white transition-all hover:cursor-pointer flex"
            data-testid="removeMessageButton"
            on:click={removeMessage}
        >
            <IconTrash font-size={16} />
        </button>
    {/if}
</div>

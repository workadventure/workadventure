<script lang="ts">
    import type { ChatMessage } from "../../Connection/ChatConnection";
    import LL from "../../../../i18n/i18n-svelte";
    import { selectedChatMessageToEdit, selectedChatMessageToReply } from "../../Stores/ChatStore";
    import EmojiButton from "./EmojiButton.svelte";
    import { IconArrowBackUp, IconArrowDown, IconMessageCircle2, IconPencil, IconTrash } from "@wa-icons";

    interface Props {
        message: ChatMessage;
        messageRef?: HTMLDivElement;
        onOpenThread?: () => Promise<void>;
    }

    let { message, messageRef, onOpenThread = undefined }: Props = $props();

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

    function addReaction(emoji: string) {
        message.addReaction(emoji).catch((error) => console.error(error));
    }

    let { content, isMyMessage, type, canDelete } = $derived(message);
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
        onclick={replyToMessage}
    >
        <IconArrowBackUp font-size={16} />
    </button>
    {#if message.openThread}
        <button
            class="p-0 m-0 text-white/50 hover:text-white transition-all hover:cursor-pointer flex"
            data-testid="openThreadButton"
            title={$LL.chat.thread.openThreadButtonTitle()}
            onclick={openThread}
        >
            <IconMessageCircle2 font-size={16} />
        </button>
    {/if}
    <EmojiButton onchange={addReaction} {messageRef} />
    {#if isMyMessage && type === "text"}
        <button
            class="p-0 m-0 text-white/50 hover:text-white transition-all hover:cursor-pointer flex"
            data-testid="editMessageButton"
            onclick={selectMessageToEdit}
        >
            <IconPencil font-size={16} />
        </button>
    {/if}
    {#if $canDelete}
        <button
            class="p-0 m-0 text-white/50 hover:text-white transition-all hover:cursor-pointer flex"
            data-testid="removeMessageButton"
            onclick={removeMessage}
        >
            <IconTrash font-size={16} />
        </button>
    {/if}
</div>

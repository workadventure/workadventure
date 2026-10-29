<script lang="ts">
    import { readable } from "svelte/store";
    import type { ChatAttachmentStatus, ChatMessage } from "../../Connection/ChatConnection";
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
        // The options go away with the message content: keep the focus on what is left of it.
        messageRef?.focus();
    }

    function selectMessageToEdit() {
        selectedChatMessageToEdit.set(message);
    }

    function addReaction(emoji: string) {
        message.addReaction(emoji).catch((error) => console.error(error));
    }

    let { content, canDelete, canReact, canEdit } = $derived(message);
    let canReply = $derived(message.canReply ?? readable(true));
    const noAttachment = readable<ChatAttachmentStatus>({ state: "ready" });
    let attachmentStatus = $derived(message.attachment?.status ?? noAttachment);
    // A file offered but not accepted, or still downloading or decrypting, has nothing to save yet.
    let canDownload = $derived(
        message.type !== "text" && $content.url !== undefined && $attachmentStatus.state === "ready",
    );
</script>

<div class="flex flex-row gap-1 items-center">
    {#if canDownload}
        <a
            href={$content.url}
            download={$content.body}
            class="p-0 m-0 text-white/50 hover:text-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/70 rounded-sm transition-all flex"
            target="_blank"
        >
            <IconArrowDown font-size={16} class="hover:cursor-pointer" />
        </a>
    {/if}
    {#if $canReply}
        <button
            class="p-0 m-0 text-white/50 hover:text-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/70 rounded-sm transition-all hover:cursor-pointer flex"
            data-testid="replyToMessageButton"
            aria-label={$LL.chat.reply()}
            title={$LL.chat.reply()}
            onclick={replyToMessage}
        >
            <IconArrowBackUp font-size={16} />
        </button>
    {/if}
    {#if message.openThread}
        <button
            class="p-0 m-0 text-white/50 hover:text-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/70 rounded-sm transition-all hover:cursor-pointer flex"
            data-testid="openThreadButton"
            title={$LL.chat.thread.openThreadButtonTitle()}
            aria-label={$LL.chat.thread.openThreadButtonTitle()}
            onclick={openThread}
        >
            <IconMessageCircle2 font-size={16} />
        </button>
    {/if}
    {#if $canReact}
        <EmojiButton onchange={addReaction} {messageRef} />
    {/if}
    {#if $canEdit}
        <button
            class="p-0 m-0 text-white/50 hover:text-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/70 rounded-sm transition-all hover:cursor-pointer flex"
            data-testid="editMessageButton"
            aria-label={$LL.chat.messageActions.edit()}
            title={$LL.chat.messageActions.edit()}
            onclick={selectMessageToEdit}
        >
            <IconPencil font-size={16} />
        </button>
    {/if}
    {#if $canDelete}
        <button
            class="p-0 m-0 text-white/50 hover:text-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/70 rounded-sm transition-all hover:cursor-pointer flex"
            data-testid="removeMessageButton"
            aria-label={$LL.chat.delete()}
            title={$LL.chat.delete()}
            onclick={removeMessage}
        >
            <IconTrash font-size={16} />
        </button>
    {/if}
</div>

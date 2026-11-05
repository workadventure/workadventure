<script lang="ts">
    import { onDestroy } from "svelte";
    import { readable } from "svelte/store";
    import type { ChatAttachmentStatus, ChatMessage } from "../../Connection/ChatConnection";
    import LL from "../../../../i18n/i18n-svelte";
    import { selectedChatMessageToEdit, selectedChatMessageToReply } from "../../Stores/ChatStore";
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
    import EmojiButton from "./EmojiButton.svelte";
    import MessageMoreMenu from "./MessageMoreMenu.svelte";
    import { decodeHtmlEntities } from "../../decodeHtmlEntities";
    import { confirmDelete } from "./confirmDeleteMessage";
    import { IconArrowBackUp, IconDots } from "@wa-icons";

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
        confirmDelete("message", async () => {
            await message.remove();
            // The options go away with the message content: keep the focus on what is left of it.
            messageRef?.focus();
        });
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

    // Proximity (bubble) messages are plain text too.
    let canCopy = $derived((message.type === "text" || message.type === "proximity") && $content.body !== "");

    function copyText(): Promise<void> {
        return navigator.clipboard.writeText(decodeHtmlEntities($content.body));
    }

    const QUICK_REACTIONS = ["👍", "❤️", "😂"];

    let hasMoreActions = $derived(!!message.openThread || canCopy || $canEdit || $canDelete || canDownload);

    let moreButton: HTMLButtonElement | undefined = $state();
    let closeMoreMenu: (() => void) | undefined;

    function hideMoreMenu() {
        const close = closeMoreMenu;
        closeMoreMenu = undefined;
        close?.();
    }

    // The menu lives at the app root: it must not outlive the message's options.
    onDestroy(hideMoreMenu);

    function toggleMoreMenu(event: MouseEvent) {
        if (closeMoreMenu) {
            hideMoreMenu();
            return;
        }
        if (!moreButton) {
            return;
        }
        // A click from Enter or Space has no pointer position: the menu then takes the focus, and gives it back.
        const fromKeyboard = event.detail === 0;
        const trigger = moreButton;
        closeMoreMenu = showFloatingUi(
            trigger,
            MessageMoreMenu,
            {
                downloadUrl: canDownload ? $content.url : undefined,
                downloadName: $content.body,
                onOpenThread: message.openThread
                    ? () => openThread().catch((error) => console.error(error))
                    : undefined,
                onCopy: canCopy ? copyText : undefined,
                onEdit: $canEdit ? selectMessageToEdit : undefined,
                onDelete: $canDelete ? removeMessage : undefined,
                onClose: () => {
                    hideMoreMenu();
                    if (fromKeyboard) {
                        trigger.focus();
                    }
                },
                keyboardNavigation: fromKeyboard,
            },
            { placement: "bottom-end" },
            4,
            false,
            true,
            () => (closeMoreMenu = undefined),
        );
    }
</script>

<!-- Quick reactions and the picker, then reply; copy and the rarer actions wait behind "⋯", delete last and apart. -->
<div class="flex flex-row gap-0.5 items-center">
    {#if $canReact}
        {#each QUICK_REACTIONS as emoji (emoji)}
            <button
                type="button"
                class="p-0 m-0 w-7 h-7 grid place-items-center rounded-md text-white/80 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/70 transition-all cursor-pointer text-base leading-none"
                aria-label={$LL.chat.messageActions.reactWith({ emoji })}
                title={$LL.chat.messageActions.reactWith({ emoji })}
                onclick={() => addReaction(emoji)}
            >
                {emoji}
            </button>
        {/each}
        <EmojiButton onchange={addReaction} {messageRef} />
    {/if}
    {#if $canReact && ($canReply || hasMoreActions)}
        <span class="w-px h-4 mx-0.5 bg-white/15" aria-hidden="true"></span>
    {/if}
    {#if $canReply}
        <button
            type="button"
            class="p-0 m-0 w-7 h-7 grid place-items-center rounded-md text-white/80 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/70 transition-all cursor-pointer"
            data-testid="replyToMessageButton"
            aria-label={$LL.chat.reply()}
            title={$LL.chat.reply()}
            onclick={replyToMessage}
        >
            <IconArrowBackUp font-size={18} />
        </button>
    {/if}
    {#if hasMoreActions}
        <button
            type="button"
            class="p-0 m-0 w-7 h-7 grid place-items-center rounded-md text-white/80 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/70 transition-all cursor-pointer"
            data-testid="moreMessageActionsButton"
            aria-label={$LL.chat.messageActions.label()}
            title={$LL.chat.messageActions.label()}
            aria-haspopup="menu"
            bind:this={moreButton}
            onclick={toggleMoreMenu}
        >
            <IconDots font-size={18} />
        </button>
    {/if}
</div>

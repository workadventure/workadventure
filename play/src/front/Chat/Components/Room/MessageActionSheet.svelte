<script lang="ts">
    import { onMount } from "svelte";
    import type { ChatMessage } from "../../Connection/ChatConnection";
    import LL from "../../../../i18n/i18n-svelte";
    import { selectedChatMessageToEdit, selectedChatMessageToReply } from "../../Stores/ChatStore";
    import { IconArrowBackUp, IconCopy, IconMessageCircle2, IconPencil, IconTrash } from "@wa-icons";

    interface Props {
        message: ChatMessage;
        onOpenThread?: () => Promise<void>;
        onClose: () => void;
    }

    let { message, onOpenThread = undefined, onClose }: Props = $props();

    const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "👀"];

    let { content, canDelete, canReact, canEdit } = $derived(message);
    // Proximity (bubble) messages are plain text too.
    let canCopy = $derived((message.type === "text" || message.type === "proximity") && $content.body !== "");
    let copied = $state(false);
    let sheet: HTMLDivElement | undefined = $state();

    // The chat panel is blurred and clips its content: render the sheet at the root, above everything.
    function portal(node: HTMLElement) {
        document.body.appendChild(node);
        return { destroy: () => node.remove() };
    }

    onMount(() => {
        sheet?.querySelector("button")?.focus();
    });

    function run(action: () => void) {
        action();
        onClose();
    }

    function copyText() {
        navigator.clipboard
            .writeText($content.body)
            .then(() => {
                copied = true;
                setTimeout(onClose, 600);
            })
            .catch((error) => console.error(error));
    }
</script>

<svelte:window
    onkeydown={(event) => {
        if (event.key === "Escape") onClose();
    }}
/>

<div use:portal class="fixed inset-0 z-[3500] flex flex-col justify-end">
    <button
        type="button"
        class="absolute inset-0 m-0 p-0 rounded-none bg-black/40 border-0 cursor-default"
        aria-label={$LL.chat.messageActions.close()}
        tabindex="-1"
        onclick={onClose}
    ></button>
    <div
        bind:this={sheet}
        role="dialog"
        aria-modal="true"
        aria-label={$LL.chat.messageActions.label()}
        data-testid="messageActionSheet"
        class="relative bg-contrast text-white rounded-t-xl pt-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col shadow-2xl"
    >
        <div class="w-9 h-1 rounded-full bg-white/30 mx-auto mb-2" aria-hidden="true"></div>
        {#if $canReact}
            <div class="flex gap-1 pb-2 mb-1 border-0 border-b border-solid border-white/10">
                {#each QUICK_REACTIONS as emoji (emoji)}
                    <button
                        type="button"
                        class="m-0 p-2 text-2xl leading-none rounded-lg [@media(hover:hover)]:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70"
                        aria-label={$LL.chat.messageActions.reactWith({ emoji })}
                        onclick={() =>
                            run(() => {
                                message.addReaction(emoji).catch((error) => console.error(error));
                            })}
                    >
                        {emoji}
                    </button>
                {/each}
            </div>
        {/if}
        <button
            type="button"
            class="action"
            data-testid="messageActionReply"
            onclick={() => run(() => selectedChatMessageToReply.set(message))}
        >
            <IconArrowBackUp font-size={20} />{$LL.chat.reply()}
        </button>
        {#if message.openThread && onOpenThread}
            <button
                type="button"
                class="action"
                onclick={() =>
                    run(() => {
                        onOpenThread?.().catch((error) => console.error(error));
                    })}
            >
                <IconMessageCircle2 font-size={20} />{$LL.chat.thread.openThreadButtonTitle()}
            </button>
        {/if}
        {#if canCopy}
            <button type="button" class="action" onclick={copyText}>
                <IconCopy font-size={20} />{copied ? $LL.chat.copied() : $LL.chat.copy()}
            </button>
        {/if}
        {#if $canEdit}
            <button type="button" class="action" onclick={() => run(() => selectedChatMessageToEdit.set(message))}>
                <IconPencil font-size={20} />{$LL.chat.messageActions.edit()}
            </button>
        {/if}
        {#if $canDelete}
            <button type="button" class="action text-danger-400" onclick={() => run(() => message.remove())}>
                <IconTrash font-size={20} />{$LL.chat.delete()}
            </button>
        {/if}
    </div>
</div>

<style>
    .action {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        margin: 0;
        padding: 0.75rem 0.5rem;
        border-radius: 0.5rem;
        text-align: start;
        font-size: 1rem;
    }
    /* Not on touch: the hover would stick under the finger that just opened the sheet. */
    @media (hover: hover) {
        .action:hover {
            background: rgb(255 255 255 / 0.1);
        }
    }
    .action:focus-visible {
        outline: 2px solid white;
        outline-offset: -2px;
    }
</style>

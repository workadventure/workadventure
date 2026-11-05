<script lang="ts">
    import { onMount } from "svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { IconArrowDown, IconCopy, IconMessageCircle2, IconPencil, IconTrash } from "@wa-icons";

    interface Props {
        downloadUrl?: string;
        downloadName?: string;
        onOpenThread?: () => void;
        onCopy?: () => Promise<void>;
        onEdit?: () => void;
        onDelete?: () => void;
        onClose: () => void;
        keyboardNavigation?: boolean;
    }

    let {
        downloadUrl,
        downloadName,
        onOpenThread,
        onCopy,
        onEdit,
        onDelete,
        onClose,
        keyboardNavigation = false,
    }: Props = $props();

    let menu: HTMLDivElement | undefined = $state();

    onMount(() => {
        if (keyboardNavigation) {
            menu?.querySelector<HTMLElement>("a, button")?.focus();
        }
    });

    let copied = $state(false);

    // Say it worked before going away.
    function copy() {
        onCopy?.()
            .then(() => {
                copied = true;
                setTimeout(onClose, 600);
            })
            .catch((error) => console.error(error));
    }

    function run(action: (() => void) | undefined) {
        onClose();
        action?.();
    }
</script>

<svelte:window
    onkeydown={(event) => {
        if (event.key === "Escape") onClose();
    }}
/>

<div
    bind:this={menu}
    role="menu"
    aria-label={$LL.chat.messageActions.label()}
    data-testid="messageMoreMenu"
    class="flex flex-col min-w-44 p-1 rounded-lg bg-contrast border border-solid border-white/15 shadow-lg text-sm text-white"
>
    {#if onOpenThread}
        <button
            type="button"
            role="menuitem"
            class="item"
            data-testid="openThreadButton"
            onclick={() => run(onOpenThread)}
        >
            <IconMessageCircle2 font-size={16} />{$LL.chat.thread.openThreadButtonTitle()}
        </button>
    {/if}
    {#if onCopy}
        <button type="button" role="menuitem" class="item" data-testid="copyMessageButton" onclick={copy}>
            <IconCopy font-size={16} />{copied ? $LL.chat.copied() : $LL.chat.copy()}
        </button>
    {/if}
    {#if onEdit}
        <button type="button" role="menuitem" class="item" data-testid="editMessageButton" onclick={() => run(onEdit)}>
            <IconPencil font-size={16} />{$LL.chat.messageActions.edit()}
        </button>
    {/if}
    {#if downloadUrl}
        <a
            role="menuitem"
            class="item no-underline text-white"
            href={downloadUrl}
            download={downloadName}
            target="_blank"
            onclick={() => onClose()}
        >
            <IconArrowDown font-size={16} /><span class="first-letter:uppercase">{$LL.chat.file.download()}</span>
        </a>
    {/if}
    {#if onDelete}
        <div class="my-1 border-0 border-t border-solid border-white/10"></div>
        <button
            type="button"
            role="menuitem"
            class="item text-danger-400"
            data-testid="removeMessageButton"
            onclick={() => run(onDelete)}
        >
            <IconTrash font-size={16} />{$LL.chat.delete()}
        </button>
    {/if}
</div>

<style>
    .item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        margin: 0;
        padding: 0.4rem 0.5rem;
        border-radius: 0.375rem;
        text-align: start;
        background: transparent;
        cursor: pointer;
    }
    .item:hover,
    .item:focus-visible {
        background: rgb(255 255 255 / 0.1);
        outline: none;
    }
</style>

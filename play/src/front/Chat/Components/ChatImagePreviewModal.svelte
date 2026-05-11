<script lang="ts">
    import { onDestroy } from "svelte";
    import { closeModal } from "svelte-modals";
    import ButtonClose from "../../Components/Input/ButtonClose.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { IconExternalLink } from "@wa-icons";

    export let url: string;
    export let alt: string | undefined = undefined;

    let containerRef: HTMLDivElement;

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            event.preventDefault();
            closeModal();
        }
    }

    onDestroy(() => {
        document.removeEventListener("keydown", handleKeydown);
    });

    document.addEventListener("keydown", handleKeydown);
</script>

<div
    bind:this={containerRef}
    class="fixed inset-0 z-[2001] flex items-center justify-center p-4 pointer-events-auto bg-black/50"
    role="dialog"
    aria-modal="true"
    aria-label={$LL.chat.imagePreview.close()}
>
    <!-- Click outside closes the modal -->
    <button
        type="button"
        class="absolute inset-0 w-full h-full cursor-default"
        aria-label={$LL.chat.imagePreview.close()}
        on:click={() => closeModal()}
    />
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="relative flex flex-col bg-contrast/75 backdrop-blur-md text-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden pointer-events-auto shadow-xl"
        on:click|stopPropagation
    >
        <div class="relative flex items-center justify-center min-h-0 p-2">
            {#if url}
                <img
                    src={url}
                    alt={alt ?? ""}
                    class="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg"
                    draggable="false"
                />
            {:else}
                <div class="text-white/90 text-sm p-4">{$LL.chat.imagePreview.notAvailable()}</div>
            {/if}
            <div
                class="absolute top-2 right-2 flex items-center justify-end gap-2 rounded-lg bg-black/40 p-1.5"
                aria-label={$LL.chat.imagePreview.imageActions()}
            >
                {#if url}
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center justify-center rounded-lg p-2 hover:bg-white/20 text-white transition-colors"
                        title={$LL.chat.imagePreview.openInNewTab()}
                    >
                        <IconExternalLink class="h-6 w-6" />
                    </a>
                {/if}
                <ButtonClose dataTestId="close-image-preview-modal" size="sm" on:click={() => closeModal()} />
            </div>
        </div>
    </div>
</div>

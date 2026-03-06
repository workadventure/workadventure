<script lang="ts">
    import { onDestroy } from "svelte";
    import { closeModal } from "svelte-modals";
    import ButtonClose from "../../Components/Input/ButtonClose.svelte";
    import LL from "../../../i18n/i18n-svelte";

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
            <img
                src={url}
                alt={alt ?? ""}
                class="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg"
                draggable="false"
            />
            <div
                class="absolute top-2 right-2 flex items-center justify-end gap-2 rounded-lg bg-black/40 p-1.5"
                aria-label="Image actions"
            >
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center justify-center rounded-lg p-2 hover:bg-white/20 text-white transition-colors"
                    title={$LL.chat.imagePreview.openInNewTab()}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="block"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
                        <path d="M11 13l9 -9" />
                        <path d="M15 4h5v5" />
                    </svg>
                </a>
                <ButtonClose dataTestId="close-image-preview-modal" size="sm" on:click={() => closeModal()} />
            </div>
        </div>
    </div>
</div>

<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { NonUndefinedFields, Recording } from "@workadventure/messages";
    import DownloadIcon from "../../Icons/DownloadIcon.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";

    export let show = false;
    export let x = 0;
    export let y = 0;
    export let currentRecord: NonUndefinedFields<Recording> | null = null;
    export let buttonElement: HTMLElement | null = null;

    const dispatch = createEventDispatcher<{
        delete: { record: NonUndefinedFields<Recording> };
    }>();

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (show && !target.closest(".context-menu") && !target.closest(".context-menu-trigger")) {
            show = false;
        }
    }

    async function downloadFile(url: string, filename: string) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Erreur lors du téléchargement:", error);
        }
    }

    async function copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error("Error copying to clipboard:", err);
        }
    }

    function openInNewTab(url: string) {
        window.open(url, "_blank");
    }

    function handleDelete() {
        if (currentRecord) {
            dispatch("delete", { record: currentRecord });
        }
        show = false;
    }

    $: if (show) {
        document.addEventListener("click", handleClickOutside);
        console.log("Context menu opened at", x, y, "for record", currentRecord);
    } else {
        document.removeEventListener("click", handleClickOutside);
    }
</script>

{#if show}
    {#if currentRecord?.videoFile}
        <div
            class="context-menu flex flex-col gap-1 min-w-[200px] absolute bg-contrast/80 backdrop-blur-md rounded-md shadow-lg py-1 z-50 -translate-x-full p-1"
            style="top: {y + (buttonElement?.offsetHeight || 0) + 5}px; left: {x +
                (buttonElement?.offsetWidth || 0)}px;"
        >
            <button
                class="w-full p-2 text-left flex items-center gap-2 bg-secondary-800 hover:bg-secondary cursor-pointer rounded"
                on:click={() =>
                    currentRecord && downloadFile(currentRecord.videoFile.url, currentRecord.videoFile.filename)}
            >
                <DownloadIcon height="h-4" width="w-4" />
                {$LL.recording.download()}
            </button>

            <button
                class="w-full p-2 text-left hover:bg-secondary-700 flex items-center gap-2 hover:bg-white/20 cursor-pointer rounded"
                on:click={() => copyToClipboard(currentRecord.videoFile.url)}
            >
                {$LL.recording.contextMenu.copyLink()}
            </button>

            <button
                class="w-full p-2 text-left hover:bg-secondary-700 flex items-center gap-2 hover:bg-white/20 cursor-pointer rounded"
                on:click={() => openInNewTab(currentRecord.videoFile.url)}
            >
                {$LL.recording.contextMenu.openInNewTab()}
            </button>

            <!-- <button
                class="w-full px-4 py-2 text-left hover:bg-secondary-700 flex items-center gap-2"
                on:click={() => handleClick('open')}
            >
                <IconExternalLink class="w-4 h-4"  />
                Ouvrir dans un nouvel onglet
            </button> -->

            <div class="h-[1px] w-full bg-white/20" />

            <button
                class="w-full p-2 text-left hover:bg-red-500 text-red-400 hover:text-white flex items-center gap-2 rounded"
                on:click={() => handleDelete()}
            >
                {$LL.recording.contextMenu.delete()}
            </button>
        </div>
    {/if}
{/if}

<script lang="ts">
    import * as Sentry from "@sentry/svelte";
    import { onDestroy, onMount } from "svelte";
    import type { NonUndefinedFields, Recording } from "@workadventure/messages";
    import DownloadIcon from "../../Icons/DownloadIcon.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import type { RoomConnection } from "../../../Connection/RoomConnection.ts";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";

    export let currentRecord: NonUndefinedFields<Recording>;
    export let connection: RoomConnection | undefined = undefined;
    export let onDelete: () => void;
    export let onClose: () => void;

    async function downloadFile(filename: string) {
        try {
            if (!currentRecord?.videoFile?.key) {
                console.error("No video file key available for download");
                Sentry.captureException(new Error("No video file key available for download"));
                notificationPlayingStore.playNotification($LL.recording.notification.downloadFailedNotification());
                return;
            }

            if (!connection) {
                console.error("Connection is not available");
                Sentry.captureException(new Error("Connection is not available"));
                notificationPlayingStore.playNotification($LL.recording.notification.downloadFailedNotification());
                return;
            }
            // Get signed URL for secure download
            const downloadUrl = await connection.getSignedUrl(currentRecord.videoFile.key);

            if (!downloadUrl) {
                throw new Error("Failed to generate signed URL");
            }

            // Create hidden download link to avoid page redirection
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = filename;
            link.style.display = "none"; // Hide the link element
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error downloading the file:", error);
            notificationPlayingStore.playNotification($LL.recording.notification.downloadFailedNotification());
        }
    }

    function handleDelete() {
        onDelete();
        onClose();
    }

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest(".context-menu") && !target.closest(".context-menu-trigger")) {
            onClose();
        }
    }

    // Set up click outside handler with proper cleanup
    onMount(() => {
        // Use setTimeout to avoid immediately triggering on the click that opened the menu
        setTimeout(() => {
            document.addEventListener("click", handleClickOutside);
        }, 0);
    });

    onDestroy(() => {
        document.removeEventListener("click", handleClickOutside);
    });
</script>

{#if currentRecord?.videoFile}
    <div
        data-testid="recording-context-menu"
        class="context-menu flex flex-col gap-1 min-w-[200px] z-50 absolute bg-contrast/80 backdrop-blur-md rounded-md shadow-lg py-1 p-1"
    >
        <button
            class="w-full p-2 text-left flex items-center gap-2 bg-secondary-800 hover:bg-secondary cursor-pointer rounded"
            on:click={() => downloadFile(currentRecord.videoFile.filename)}
        >
            <DownloadIcon height="h-4" width="w-4" />
            {$LL.recording.download()}
        </button>

        <div class="h-[1px] w-full bg-white/20" />

        <button
            data-testid="recording-context-menu-delete"
            class="w-full p-2 text-left hover:bg-red-500 text-red-400 hover:text-white flex items-center gap-2 rounded"
            on:click={() => handleDelete()}
        >
            {$LL.recording.contextMenu.delete()}
        </button>
    </div>
{/if}

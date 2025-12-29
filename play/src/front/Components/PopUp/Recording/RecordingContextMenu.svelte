<script lang="ts">
    import * as Sentry from "@sentry/svelte";
    import { createEventDispatcher } from "svelte";
    import type { NonUndefinedFields, Recording } from "@workadventure/messages";
    import DownloadIcon from "../../Icons/DownloadIcon.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import type { RoomConnection } from "../../../Connection/RoomConnection.ts";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";

    export let show = false;
    export let y = 0;
    export let currentRecord: NonUndefinedFields<Recording> | null = null;
    export let buttonElement: HTMLElement | null = null;
    export const connection: RoomConnection | undefined = undefined;

    // Dynamic positioning logic
    let menuPosition = { left: 0, right: "auto", transform: "-translate-x-full" };
    let menuWidth = 200; // Default menu width

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

    // Calculate optimal menu position based on available space
    function calculateMenuPosition() {
        if (!buttonElement) return;

        const buttonRect = buttonElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const buttonLeft = buttonRect.left;
        const buttonRight = buttonRect.right;

        // Calculate space available on both sides
        const spaceOnLeft = buttonLeft;
        const spaceOnRight = viewportWidth - buttonRight;

        // Determine if menu should open to the right or left
        const shouldOpenRight = spaceOnRight >= menuWidth || spaceOnLeft < menuWidth;

        if (shouldOpenRight) {
            // Open to the right
            console.log("buttonRight", buttonRight);
            menuPosition = {
                left: buttonLeft - menuWidth - 5,
                right: "auto",
                transform: "none",
            };
        } else {
            // Open to the left
            console.log("buttonLeft", buttonLeft);
            menuPosition = {
                left: buttonLeft - menuWidth - 5,
                right: "auto",
                transform: "none",
            };
        }
    }

    $: if (show) {
        document.addEventListener("click", handleClickOutside);
        // Calculate position when menu becomes visible
        setTimeout(() => calculateMenuPosition(), 0);
    } else {
        document.removeEventListener("click", handleClickOutside);
    }
</script>

{#if show}
    {#if currentRecord?.videoFile}
        <div
            data-testid="recording-context-menu"
            class=" context-menu flex flex-col gap-1 min-w-[200px] z-50 absolute bg-contrast/80 backdrop-blur-md rounded-md shadow-lg py-1 p-1"
            style="top: {y +
                (buttonElement?.offsetHeight || 0) +
                5}px; left: {menuPosition.left}px; right: {menuPosition.right}; transform: {menuPosition.transform};"
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
{/if}

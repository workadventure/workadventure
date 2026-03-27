<script lang="ts">
    import { onMount } from "svelte";
    import type { NonUndefinedFields, Recording } from "@workadventure/messages";
    import type { GameScene } from "../../../Phaser/Game/GameScene";
    import PopUpContainer from "../PopUpContainer.svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import Spinner from "../../Icons/Spinner.svelte";
    import { showRecordingList } from "../../../Stores/RecordingStore";
    import ButtonClose from "../../Input/ButtonClose.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { coWebsites } from "../../../Stores/CoWebsiteStore";
    import { VideoCoWebsite } from "../../../WebRtc/CoWebsite/VideoCoWebsite";
    import DownloadIcon from "../../Icons/DownloadIcon.svelte";
    import { IconRefresh, IconTrash, IconCamera, IconLayoutGrid, IconList, IconPlayFilled, IconDots } from "@wa-icons";
    import { localUserStore } from "../../../Connection/LocalUserStore";

    const connection: GameScene["connection"] = gameManager.getCurrentGameScene().connection;

    type ViewMode = "list" | "card";

    let viewMode: ViewMode = "list";
    let recordings: NonUndefinedFields<Recording>[] = [];
    let isLoading: boolean = false;
    let isError: boolean = false;

    function setViewMode(mode: ViewMode): void {
        viewMode = mode;
        try {
            localUserStore.setRecordingsViewMode(mode);
        } catch {
            // ignore localStorage errors (e.g. private mode)
        }
    }

    let hoveredRecordIndex: number = -1;
    let thumbnailIndex: number = 1;
    let thumbnailInterval: number | null = null;

    /** Card mode: filename of the card showing the actions panel (download/delete), or null */
    let actionsCardFilename: string | null = null;

    function close(): void {
        actionsCardFilename = null;
        $showRecordingList = false;
    }

    async function downloadRecording(record: NonUndefinedFields<Recording>): Promise<void> {
        const videoFile = record?.videoFile;
        if (!videoFile?.key) {
            notificationPlayingStore.playNotification($LL.recording.notification.downloadFailedNotification());
            return;
        }
        if (!connection) {
            notificationPlayingStore.playNotification($LL.recording.notification.downloadFailedNotification());
            return;
        }
        try {
            const downloadUrl = await connection.getSignedUrl(videoFile.key);
            if (!downloadUrl) throw new Error("Failed to generate signed URL");
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = videoFile.filename;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            actionsCardFilename = null;
        } catch {
            notificationPlayingStore.playNotification($LL.recording.notification.downloadFailedNotification());
        }
    }

    async function openVideoInCoWebsite(videoKey: string, filename: string): Promise<void> {
        if (!connection) {
            console.error("Connection is not available");
            return;
        }
        try {
            const signedUrl = await connection.getSignedUrl(videoKey);
            const videoCoWebsite = new VideoCoWebsite(
                new URL(signedUrl),
                filename,
                50, // 50% width
                true // closable
            );
            coWebsites.add(videoCoWebsite);
        } catch (error) {
            console.error("Failed to get signed URL for video:", error);
            notificationPlayingStore.playNotification($LL.recording.notification.downloadFailedNotification());
        }
    }

    async function handleDelete(record: NonUndefinedFields<Recording>): Promise<void> {
        const videoFile = record?.videoFile;
        if (!videoFile?.filename) {
            notificationPlayingStore.playNotification($LL.recording.notification.deleteFailedNotification());
            return;
        }

        try {
            if (!connection) {
                console.error("Connection is not available");
                return;
            }
            await connection.deleteRecording(videoFile.filename);

            actionsCardFilename = actionsCardFilename === videoFile.filename ? null : actionsCardFilename;
            recordings = recordings.filter((r) => r.videoFile?.filename !== videoFile.filename);

            notificationPlayingStore.playNotification($LL.recording.notification.deleteNotification());
        } catch (error) {
            console.error("Failed to delete recording:", error);
            notificationPlayingStore.playNotification($LL.recording.notification.deleteNotification());
        }
    }

    async function queryRecordings(): Promise<void> {
        isLoading = true;
        if (!connection) return;
        try {
            const recordingsAnswer = await connection.queryRecordings();
            isLoading = false;
            isError = false;
            recordings = recordingsAnswer;
        } catch (error) {
            console.error("Failed to query recordings:", error);
            isLoading = false;
            isError = true;
        }
    }

    function startThumbnailCycle(recordIndex: number, thumbnails: NonUndefinedFields<Recording>["thumbnails"]): void {
        if (thumbnails.length <= 2) return;

        hoveredRecordIndex = recordIndex;
        thumbnailIndex = 1;

        thumbnailInterval = window.setInterval(() => {
            thumbnailIndex = (thumbnailIndex + 1) % thumbnails.length || 1;
        }, 650);
    }

    function stopThumbnailCycle(): void {
        if (thumbnailInterval) {
            clearInterval(thumbnailInterval);
            thumbnailInterval = null;
        }
        hoveredRecordIndex = -1;
        thumbnailIndex = 1;
    }

    function getDaysUntilExpiration(filename: string): number | null {
        const dateMatch = filename.match(/recording-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);

        if (!dateMatch) {
            return null;
        }

        const recordingDate = new Date(dateMatch[1]);
        const expirationDate = new Date(recordingDate);
        expirationDate.setMonth(expirationDate.getMonth() + 3);

        const today = new Date();
        const diffInMs = expirationDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

        return daysRemaining;
    }

    /** Return expiration date (recording + 3 months) or null */
    function getExpirationDate(filename: string): Date | null {
        const dateMatch = filename.match(/recording-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
        if (!dateMatch) return null;
        const d = new Date(dateMatch[1]);
        d.setMonth(d.getMonth() + 3);
        return d;
    }

    function formatExpirationDate(filename: string): string {
        const d = getExpirationDate(filename);
        if (!d) return "";
        return d.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }

    /** Format filename timestamp as a readable date (e.g. "25 Feb 2025, 14:30") */
    function formatRecordingDate(filename: string): string {
        const dateMatch = filename.match(/recording-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
        if (!dateMatch) return filename;
        const d = new Date(dateMatch[1]);
        return d.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    onMount(async () => {
        try {
            const stored = localUserStore.getRecordingsViewMode();
            if (stored === "card" || stored === "list") {
                viewMode = stored;
            }
        } catch {
            // ignore
        }
        await queryRecordings();
    });
</script>

<div class="absolute inset-0 z-30 flex items-center justify-center">
    <div class="relative h-fit w-11/12 max-w-[42rem]">
        <PopUpContainer fullContent={true}>
            <div class="mb-4 flex items-center justify-between gap-3">
                <h2 class="flex-1 text-xl font-bold text-inherit m-0 text-left">{$LL.recording.title()}</h2>
                <div class="flex items-center gap-1 md:gap-6">
                    <div class="flex items-center gap-1 md:gap-2">
                        <button
                            type="button"
                            class="inline-flex cursor-pointer items-center justify-center rounded border border-white/20 bg-white/5 p-2 h-12 w-12 text-inherit transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                            on:click={() => setViewMode(viewMode === "list" ? "card" : "list")}
                            title={viewMode === "list" ? $LL.recording.viewCards() : $LL.recording.viewList()}
                            aria-label={viewMode === "list" ? $LL.recording.viewCards() : $LL.recording.viewList()}
                        >
                            {#if viewMode === "list"}
                                <IconLayoutGrid class="h-5 w-5" />
                            {:else}
                                <IconList class="h-5 w-5" />
                            {/if}
                        </button>
                        <button
                            class="inline-flex cursor-pointer items-center justify-center rounded border border-white/20 bg-white/5 h-12 w-12 text-inherit transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                            on:click={() => queryRecordings()}
                            title={$LL.recording.refresh()}
                        >
                            <IconRefresh />
                            <span class="sr-only">{$LL.recording.refresh()}</span>
                        </button>
                    </div>
                    <ButtonClose dataTestId="close-recording-modal" on:click={() => close()} />
                </div>
            </div>

            <div class="min-h-32">
                {#if isLoading}
                    <div class="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center text-white/80">
                        <Spinner size="lg" />
                    </div>
                {:else if isError}
                    <div class="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center">
                        <div
                            class="flex h-10 w-10 items-center justify-center rounded bg-red-500/20 text-xl font-bold text-red-300"
                            aria-hidden="true"
                        >
                            !
                        </div>
                        <p class="m-0 text-[0.9375rem] text-red-300">{$LL.recording.errorFetchingRecordings()}</p>
                        <button class="btn btn-secondary btn-sm" on:click={() => queryRecordings()}>
                            {$LL.recording.refresh()}
                        </button>
                    </div>
                {:else if recordings.length === 0}
                    <div class="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center">
                        <div class="h-12 w-12 text-white/40 [&_svg]:h-full [&_svg]:w-full" aria-hidden="true">
                            <IconCamera />
                        </div>
                        <p class="m-0 text-[0.9375rem] text-white/70">{$LL.recording.noRecordings()}</p>
                    </div>
                {:else if viewMode === "list"}
                    <ul
                        class="flex max-h-[50vh] list-none flex-col justify-start gap-0 overflow-y-auto p-0 pe-0.5 m-0"
                        role="list"
                    >
                        {#each recordings as record, index (record.videoFile.filename)}
                            {@const days = getDaysUntilExpiration(record.videoFile.filename)}
                            {@const expiryDateStr = formatExpirationDate(record.videoFile.filename)}
                            <li class="flex min-h-20 items-stretch gap-2 my-1">
                                <button
                                    type="button"
                                    class="group flex min-w-0 flex-1 cursor-pointer items-stretch gap-3 overflow-hidden rounded border-none bg-white/[0.06] p-0 m-0 text-left text-inherit transition-all hover:-translate-y-px hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                                    on:mouseenter={() => startThumbnailCycle(index, record.thumbnails)}
                                    on:mouseleave={stopThumbnailCycle}
                                    on:click={() =>
                                        openVideoInCoWebsite(record.videoFile.key, record.videoFile.filename)}
                                    data-testid="recording-item-{index}"
                                >
                                    <span
                                        class="relative w-40 min-w-40 shrink-0 overflow-hidden rounded bg-black/30 aspect-video"
                                    >
                                        <img
                                            class="absolute inset-0 h-full w-full object-cover"
                                            src={hoveredRecordIndex === index
                                                ? record.thumbnails[thumbnailIndex]?.url
                                                : record.thumbnails[1]?.url}
                                            alt=""
                                        />
                                        <span
                                            class="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                            aria-hidden="true"
                                        >
                                            <IconPlayFilled class="h-6 w-6" />
                                        </span>
                                    </span>
                                    <span class="flex min-w-0 flex-1 flex-col justify-center gap-1 py-3 pr-2 pl-0">
                                        <span class="text-[0.9375rem] font-semibold leading-tight"
                                            >{formatRecordingDate(record.videoFile.filename)}</span
                                        >
                                        {#if days !== null && expiryDateStr}
                                            <span class="text-xs text-white/60">
                                                {$LL.recording.expireIn({
                                                    days,
                                                    s: days !== 1 ? "s" : "",
                                                })}
                                                · {$LL.recording.expiresOn({ date: expiryDateStr })}
                                            </span>
                                        {/if}
                                    </span>
                                    <div
                                        class="flex shrink-0 items-center gap-1 self-center rounded border hover:border-white/20 hover:bg-white/5 p-1 mr-2"
                                        role="group"
                                        aria-label="Actions"
                                    >
                                        <button
                                            type="button"
                                            class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-white/70 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                                            data-testid="recording-download-{index}"
                                            on:click={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                downloadRecording(record).catch((error) => {
                                                    console.error("Failed to download recording:", error);
                                                });
                                            }}
                                            title={$LL.recording.download()}
                                            aria-label={$LL.recording.download()}
                                        >
                                            <DownloadIcon height="h-4" width="w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-red-400/90 transition-colors hover:bg-red-500/20 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                                            data-testid="recording-delete-{index}"
                                            on:click={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDelete(record).catch((error) => {
                                                    console.error("Failed to delete recording:", error);
                                                });
                                            }}
                                            title={$LL.recording.contextMenu.delete()}
                                            aria-label={$LL.recording.contextMenu.delete()}
                                        >
                                            <IconTrash class="h-4 w-4" />
                                        </button>
                                    </div>
                                </button>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <div class="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto pe-0.5 md:grid-cols-3" role="list">
                        {#each recordings as record, index (record.videoFile.filename)}
                            {@const days = getDaysUntilExpiration(record.videoFile.filename)}
                            {@const expiryDateStr = formatExpirationDate(record.videoFile.filename)}
                            {@const showActions = actionsCardFilename === record.videoFile.filename}
                            <div
                                class="group relative flex min-w-0 flex-col overflow-hidden rounded bg-white/[0.06] transition-all hover:bg-white/10"
                                role="listitem"
                            >
                                {#if showActions}
                                    <div
                                        class="flex min-h-[8rem] flex-1 flex-col items-center justify-center gap-3 rounded border border-white/15 bg-white/[0.08] p-4"
                                    >
                                        <button
                                            type="button"
                                            class="flex w-full cursor-pointer items-center justify-center gap-2 rounded border-none bg-white/15 py-2.5 px-3 text-sm font-medium text-inherit transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                                            data-testid="recording-download-{index}"
                                            on:click={() =>
                                                downloadRecording(record).catch((error) => {
                                                    console.error("Failed to download recording:", error);
                                                })}
                                        >
                                            <DownloadIcon height="h-4" width="w-4" />
                                            {$LL.recording.download()}
                                        </button>
                                        <button
                                            type="button"
                                            class="flex w-full cursor-pointer items-center justify-center gap-2 rounded border-none bg-red-500/20 py-2.5 px-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                                            data-testid="recording-delete-{index}"
                                            on:click={() => handleDelete(record)}
                                        >
                                            <IconTrash class="h-4 w-4" />
                                            {$LL.recording.contextMenu.delete()}
                                        </button>
                                        <button
                                            type="button"
                                            class="mt-1 text-xs text-white/60 underline-offset-2 hover:text-white/80 hover:underline"
                                            on:click={() => (actionsCardFilename = null)}
                                        >
                                            {$LL.recording.back()}
                                        </button>
                                    </div>
                                {:else}
                                    <button
                                        type="button"
                                        class="flex min-w-0 flex-1 cursor-pointer flex-col overflow-hidden rounded border-none bg-transparent p-0 m-0 text-left text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                                        on:mouseenter={() => startThumbnailCycle(index, record.thumbnails)}
                                        on:mouseleave={stopThumbnailCycle}
                                        on:click={() =>
                                            openVideoInCoWebsite(record.videoFile.key, record.videoFile.filename)}
                                        data-testid="recording-item-{index}"
                                    >
                                        <span
                                            class="relative block w-full overflow-hidden rounded-t bg-black/30 aspect-video"
                                        >
                                            <img
                                                class="absolute inset-0 h-full w-full object-cover"
                                                src={hoveredRecordIndex === index
                                                    ? record.thumbnails[thumbnailIndex]?.url
                                                    : record.thumbnails[1]?.url}
                                                alt=""
                                            />
                                            <span
                                                class="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                                aria-hidden="true"
                                            >
                                                <IconPlayFilled class="h-8 w-8" />
                                            </span>
                                        </span>
                                        <span class="flex min-w-0 flex-col gap-0.5 px-3 py-2">
                                            <span class="truncate text-[0.8125rem] font-semibold leading-tight"
                                                >{formatRecordingDate(record.videoFile.filename)}</span
                                            >
                                            {#if days !== null && expiryDateStr}
                                                <span class="text-xs text-white/60">
                                                    {$LL.recording.expireIn({
                                                        days,
                                                        s: days !== 1 ? "s" : "",
                                                    })}
                                                    · {$LL.recording.expiresOn({ date: expiryDateStr })}
                                                </span>
                                            {/if}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        class="absolute top-2 right-2 z-10 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-white/20 bg-black/50 text-white/90 backdrop-blur-sm transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                                        on:click={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            actionsCardFilename = record.videoFile.filename;
                                        }}
                                        title={$LL.recording.actions()}
                                        aria-label={$LL.recording.actions()}
                                    >
                                        <IconDots class="h-4 w-4" />
                                    </button>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </PopUpContainer>
    </div>
</div>

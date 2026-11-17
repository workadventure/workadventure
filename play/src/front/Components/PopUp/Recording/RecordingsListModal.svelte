<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { NonUndefinedFields, Recording } from "@workadventure/messages";
    import type { GameScene } from "../../../Phaser/Game/GameScene";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import Spinner from "../../Icons/Spinner.svelte";
    import { showRecordingList } from "../../../Stores/RecordingStore";
    import ButtonClose from "../../Input/ButtonClose.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { coWebsites } from "../../../Stores/CoWebsiteStore";
    import { VideoCoWebsite } from "../../../WebRtc/CoWebsite/VideoCoWebsite";
    import DownloadIcon from "../../Icons/DownloadIcon.svelte";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import Button from "../../UI/Button.svelte";
    import {
        IconRefresh,
        IconTrash,
        IconVideo,
        IconLayoutGrid,
        IconList,
        IconPlayFilled,
        IconClock,
        IconAlertTriangle,
    } from "@wa-icons";

    type Rec = NonUndefinedFields<Recording>;
    type ViewMode = "list" | "card";

    /** Recordings are deleted from the bucket this long after they were made. */
    const RETENTION_MONTHS = 3;
    /** The expiry is only worth showing once it gets close. */
    const EXPIRY_WARNING_DAYS = 14;

    const connection: GameScene["connection"] = gameManager.getCurrentGameScene().connection;

    let viewMode: ViewMode = $state("card");
    let recordings: Rec[] = $state([]);
    /** True until the first answer: later refreshes keep the list on screen. */
    let isFirstLoad = $state(true);
    let isRefreshing = $state(false);
    let isError = $state(false);
    /** Filename of the recording whose deletion is being confirmed, or null. */
    let confirmingFilename: string | null = $state(null);

    let hoveredRecordIndex = $state(-1);
    let thumbnailIndex = $state(0);
    let thumbnailInterval: number | null = null;
    /** Signed thumbnail URLs of the recording being hovered, empty while they load. */
    let hoveredThumbnails: string[] = $state([]);
    /** Thumbnails are fetched per recording, on hover: keep them for as long as the modal is open. */
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const thumbnailsRequests = new Map<string, Promise<string[]>>();

    function setViewMode(mode: ViewMode): void {
        viewMode = mode;
        confirmingFilename = null;
        try {
            localUserStore.setRecordingsViewMode(mode);
        } catch {
            // ignore localStorage errors (e.g. private mode)
        }
    }

    function close(): void {
        $showRecordingList = false;
    }

    async function downloadRecording(record: Rec): Promise<void> {
        const videoFile = record?.videoFile;
        if (!videoFile?.key || !connection) {
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
            coWebsites.add(new VideoCoWebsite(new URL(signedUrl), filename, 50, true));
        } catch (error) {
            console.error("Failed to get signed URL for video:", error);
            notificationPlayingStore.playNotification($LL.recording.notification.downloadFailedNotification());
        }
    }

    async function handleDelete(record: Rec): Promise<void> {
        const filename = record?.videoFile?.filename;
        confirmingFilename = null;
        if (!filename || !connection) {
            notificationPlayingStore.playNotification($LL.recording.notification.deleteFailedNotification());
            return;
        }
        try {
            const { success } = await connection.deleteRecording(filename);
            if (!success) {
                notificationPlayingStore.playNotification($LL.recording.notification.deleteFailedNotification());
                return;
            }
            recordings = recordings.filter((r) => r.videoFile?.filename !== filename);
            notificationPlayingStore.playNotification($LL.recording.notification.deleteNotification());
        } catch (error) {
            console.error("Failed to delete recording:", error);
            notificationPlayingStore.playNotification($LL.recording.notification.deleteFailedNotification());
        }
    }

    async function queryRecordings(): Promise<void> {
        if (!connection) return;
        isRefreshing = true;
        confirmingFilename = null;
        // The signed URLs these hold expire after an hour.
        thumbnailsRequests.clear();
        try {
            recordings = await connection.queryRecordings();
            isError = false;
        } catch (error) {
            console.error("Failed to query recordings:", error);
            isError = true;
        } finally {
            isRefreshing = false;
            isFirstLoad = false;
        }
    }

    /**
     * The list only carries one poster per recording, so the frames of the hover preview are fetched
     * for that recording only, the first time it is hovered.
     */
    function loadThumbnails(baseFilename: string): Promise<string[]> {
        let request = thumbnailsRequests.get(baseFilename);
        if (!request) {
            request = (connection?.queryRecordingThumbnails(baseFilename) ?? Promise.resolve([])).catch((error) => {
                console.error("Failed to query recording thumbnails:", error);
                // Let a later hover try again.
                thumbnailsRequests.delete(baseFilename);
                return [];
            });
            thumbnailsRequests.set(baseFilename, request);
        }
        return request;
    }

    async function startThumbnailCycle(recordIndex: number, record: Rec): Promise<void> {
        hoveredRecordIndex = recordIndex;
        thumbnailIndex = 0;
        hoveredThumbnails = [];

        const urls = await loadThumbnails(record.baseFilename);

        // The pointer may have left, or moved to another recording, while the thumbnails were loading.
        if (hoveredRecordIndex !== recordIndex || urls.length <= 1) return;

        hoveredThumbnails = urls;
        // Hovering the same recording twice while it loads resolves both calls: never leak the first interval.
        if (thumbnailInterval) {
            clearInterval(thumbnailInterval);
        }
        thumbnailInterval = window.setInterval(() => {
            thumbnailIndex = (thumbnailIndex + 1) % urls.length;
        }, 650);
    }

    function stopThumbnailCycle(): void {
        if (thumbnailInterval) {
            clearInterval(thumbnailInterval);
            thumbnailInterval = null;
        }
        hoveredRecordIndex = -1;
        thumbnailIndex = 0;
        hoveredThumbnails = [];
    }

    function thumbnailSrc(record: Rec, index: number): string | undefined {
        if (hoveredRecordIndex === index && hoveredThumbnails.length > 0) {
            return hoveredThumbnails[thumbnailIndex];
        }
        // Recordings whose thumbnails failed to generate have no poster.
        return record.posterUrl || undefined;
    }

    /** The timestamp is "YYYY-MM-DDTHH:MM:SS", taken from the file name by the pusher. */
    function recordingDate(record: Rec): Date | null {
        const date = new Date(record.timestamp);
        return isNaN(date.getTime()) ? null : date;
    }

    function formatRecordingDate(record: Rec): string {
        const date = recordingDate(record);
        if (!date) return record.videoFile.filename;
        return date.toLocaleString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function formatSize(bytes: number | undefined): string {
        if (typeof bytes !== "number" || bytes <= 0) return "";
        const inGigabytes = bytes >= 1e9;
        return new Intl.NumberFormat(undefined, {
            style: "unit",
            unit: inGigabytes ? "gigabyte" : "megabyte",
            unitDisplay: "short",
            maximumFractionDigits: inGigabytes ? 1 : 0,
        }).format(inGigabytes ? bytes / 1e9 : Math.max(1, Math.round(bytes / 1e6)));
    }

    /** Days left before the recording is deleted, or null when it is not close yet. */
    function daysBeforeExpiry(record: Rec): number | null {
        const date = recordingDate(record);
        if (!date) return null;
        // eslint-disable-next-line svelte/prefer-svelte-reactivity
        const expiry = new Date(date);
        expiry.setMonth(expiry.getMonth() + RETENTION_MONTHS);
        const days = Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 86_400_000));
        return days <= EXPIRY_WARNING_DAYS ? days : null;
    }

    // The modal can be closed while a thumbnail cycle is running.
    onDestroy(stopThumbnailCycle);

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

    const segmentClass =
        "inline-flex h-8 w-9 cursor-pointer items-center justify-center rounded border-none p-0 transition-colors";
    const iconButtonClass =
        "inline-flex h-11 w-11 sm:h-9 sm:w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-0 text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60";
    /** Hidden until hovered with a mouse; always shown on touch screens, which cannot hover. */
    const revealOnHoverClass =
        "pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100 transition-opacity";
</script>

{#snippet thumbnail(record: Rec, index: number, sizeClass: string, playIconClass: string)}
    {@const src = thumbnailSrc(record, index)}
    <span class="relative block shrink-0 overflow-hidden bg-[#0f1826] aspect-video {sizeClass}">
        {#if src}
            <img class="absolute inset-0 h-full w-full object-cover" {src} alt="" />
        {:else}
            <span
                class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-xs text-white/55"
                aria-hidden="true"
            >
                <IconVideo class="h-6 w-6" />
            </span>
        {/if}
        <span
            class="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
        >
            <IconPlayFilled class={playIconClass} />
        </span>
    </span>
{/snippet}

{#snippet expiryBadge(days: number, extraClass: string)}
    <span class="inline-flex items-center gap-1 text-xs font-medium text-[#FFB547] {extraClass}">
        <IconClock class="h-3 w-3" />
        {$LL.recording.expireIn({ days, s: days !== 1 ? "s" : "" })}
    </span>
{/snippet}

{#snippet actions(record: Rec, index: number, extraClass: string)}
    <div class="flex shrink-0 items-center gap-0.5 {revealOnHoverClass} {extraClass}">
        <button
            type="button"
            class={iconButtonClass}
            data-testid="recording-download-{index}"
            onclick={() => downloadRecording(record)}
            title={$LL.recording.download()}
            aria-label={$LL.recording.download()}
        >
            <DownloadIcon height="h-4" width="w-4" />
        </button>
        <button
            type="button"
            class={iconButtonClass}
            data-testid="recording-delete-{index}"
            onclick={() => (confirmingFilename = record.videoFile.filename)}
            title={$LL.recording.contextMenu.delete()}
            aria-label={$LL.recording.contextMenu.delete()}
        >
            <IconTrash class="h-4 w-4" />
        </button>
    </div>
{/snippet}

{#snippet confirmButtons(record: Rec, index: number)}
    <Button variant="secondary" size="sm" onclick={() => (confirmingFilename = null)}>
        {$LL.recording.deleteConfirm.cancel()}
    </Button>
    <Button
        variant="danger"
        size="sm"
        dataTestId="recording-delete-confirm-{index}"
        onclick={() => handleDelete(record)}
    >
        {$LL.recording.contextMenu.delete()}
    </Button>
{/snippet}

<div class="absolute inset-0 z-30 flex items-stretch justify-center sm:items-center">
    <section
        aria-labelledby="recordings-title"
        class="flex w-full flex-col gap-4 bg-contrast/95 p-4 text-white backdrop-blur-md sm:h-fit sm:max-h-[86vh] sm:w-11/12 sm:max-w-[42rem] sm:rounded-lg sm:bg-contrast/80 sm:p-6 xl:max-w-[65rem]"
    >
        <header class="flex items-center gap-2 sm:gap-3">
            <h2 id="recordings-title" class="m-0 flex flex-1 items-baseline gap-2.5 text-xl font-bold">
                {$LL.recording.title()}
                {#if recordings.length > 0}
                    <span class="text-sm font-medium text-white/70">{recordings.length}</span>
                {/if}
            </h2>
            <div class="flex gap-0.5 rounded-md bg-white/[0.06] p-[3px]" role="group">
                <button
                    type="button"
                    class="{segmentClass} {viewMode === 'card'
                        ? 'bg-secondary text-white'
                        : 'bg-transparent text-white/75 hover:text-white'}"
                    aria-pressed={viewMode === "card"}
                    onclick={() => setViewMode("card")}
                    title={$LL.recording.viewCards()}
                    aria-label={$LL.recording.viewCards()}
                >
                    <IconLayoutGrid class="h-4 w-4" />
                </button>
                <button
                    type="button"
                    class="{segmentClass} {viewMode === 'list'
                        ? 'bg-secondary text-white'
                        : 'bg-transparent text-white/75 hover:text-white'}"
                    aria-pressed={viewMode === "list"}
                    onclick={() => setViewMode("list")}
                    title={$LL.recording.viewList()}
                    aria-label={$LL.recording.viewList()}
                >
                    <IconList class="h-4 w-4" />
                </button>
            </div>
            <button
                type="button"
                class={iconButtonClass}
                onclick={() => queryRecordings()}
                disabled={isRefreshing}
                title={$LL.recording.refresh()}
                aria-label={$LL.recording.refresh()}
            >
                <IconRefresh class="h-[18px] w-[18px] {isRefreshing ? 'animate-spin' : ''}" />
            </button>
            <ButtonClose dataTestId="close-recording-modal" onclick={() => close()} />
        </header>

        <div class="min-h-32 min-w-0 flex-1 overflow-y-auto pe-0.5 sm:max-h-[60vh] xl:max-h-[70vh]">
            {#if isFirstLoad}
                <div class="flex items-center justify-center py-10">
                    <Spinner size="lg" />
                </div>
            {:else if isError && recordings.length === 0}
                <div class="flex flex-col items-center justify-center gap-2.5 px-4 py-8 text-center">
                    <span
                        class="flex h-14 w-14 items-center justify-center rounded-full bg-danger/15 text-danger-400"
                        aria-hidden="true"
                    >
                        <IconAlertTriangle class="h-6 w-6" />
                    </span>
                    <p class="m-0 text-[0.9375rem] font-medium">{$LL.recording.errorFetchingRecordings()}</p>
                    <Button variant="secondary" size="sm" onclick={() => queryRecordings()}>
                        {$LL.recording.refresh()}
                    </Button>
                </div>
            {:else if recordings.length === 0}
                <div class="flex flex-col items-center justify-center gap-2.5 px-4 py-8 text-center">
                    <span
                        class="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-white/70"
                        aria-hidden="true"
                    >
                        <IconVideo class="h-6 w-6" />
                    </span>
                    <p class="m-0 text-[0.9375rem] font-medium">{$LL.recording.noRecordings()}</p>
                    <p class="m-0 max-w-xs text-sm text-white/70">{$LL.recording.noRecordingsHint()}</p>
                </div>
            {:else if viewMode === "list"}
                <ul
                    class="m-0 flex list-none flex-col gap-1.5 p-0 transition-opacity {isRefreshing
                        ? 'opacity-60'
                        : ''}"
                >
                    {#each recordings as record, index (record.videoFile.filename)}
                        {@const days = daysBeforeExpiry(record)}
                        {@const date = formatRecordingDate(record)}
                        <li
                            class="group flex min-h-[4.25rem] items-center gap-2 rounded-lg bg-white/[0.06] py-1.5 ps-1.5 pe-2 transition-colors hover:bg-white/10"
                            onmouseenter={() => startThumbnailCycle(index, record)}
                            onmouseleave={stopThumbnailCycle}
                        >
                            {#if confirmingFilename === record.videoFile.filename}
                                <div
                                    role="alertdialog"
                                    aria-label={$LL.recording.deleteConfirm.title()}
                                    class="flex flex-1 flex-wrap items-center gap-3 py-1 ps-2"
                                >
                                    <IconTrash class="h-5 w-5 shrink-0 text-danger-400" />
                                    <span class="flex min-w-40 flex-1 flex-col gap-0.5 text-left">
                                        <span class="text-sm font-medium"
                                            >{$LL.recording.deleteConfirm.titleWithDate({ date })}</span
                                        >
                                        <span class="text-xs text-white/70"
                                            >{$LL.recording.deleteConfirm.irreversible()}</span
                                        >
                                    </span>
                                    <span class="flex gap-2">{@render confirmButtons(record, index)}</span>
                                </div>
                            {:else}
                                <button
                                    type="button"
                                    class="flex min-w-0 flex-1 cursor-pointer items-center gap-3.5 rounded-md border-none bg-transparent p-0 text-left text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                                    onclick={() =>
                                        openVideoInCoWebsite(record.videoFile.key, record.videoFile.filename)}
                                    aria-label={$LL.recording.play({ date })}
                                    data-testid="recording-item-{index}"
                                >
                                    {@render thumbnail(record, index, "w-[5.5rem] sm:w-28 rounded-md", "h-5 w-5")}
                                    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <span class="truncate text-sm font-medium">{date}</span>
                                        <span class="flex flex-wrap items-center gap-x-2 text-xs text-white/70">
                                            {formatSize(record.videoFile.size)}
                                            {#if days !== null}
                                                {@render expiryBadge(days, "")}
                                            {/if}
                                        </span>
                                    </span>
                                </button>
                                {@render actions(record, index, "")}
                            {/if}
                        </li>
                    {/each}
                </ul>
            {:else}
                <ul
                    class="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3 p-0 transition-opacity sm:grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] {isRefreshing
                        ? 'opacity-60'
                        : ''}"
                >
                    {#each recordings as record, index (record.videoFile.filename)}
                        {@const days = daysBeforeExpiry(record)}
                        {@const date = formatRecordingDate(record)}
                        <li
                            class="group relative flex min-w-0 flex-col rounded-lg bg-white/[0.06] transition-colors hover:bg-white/10"
                            onmouseenter={() => startThumbnailCycle(index, record)}
                            onmouseleave={stopThumbnailCycle}
                        >
                            <button
                                type="button"
                                class="flex min-w-0 cursor-pointer flex-col rounded-lg border-none bg-transparent p-0 text-left text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                                onclick={() => openVideoInCoWebsite(record.videoFile.key, record.videoFile.filename)}
                                aria-label={$LL.recording.play({ date })}
                                data-testid="recording-item-{index}"
                            >
                                {@render thumbnail(record, index, "w-full rounded-t-lg", "h-8 w-8")}
                                <span class="flex min-w-0 flex-col gap-0.5 px-3 pt-2.5 pb-3">
                                    <span class="truncate text-sm font-medium">{date}</span>
                                    <span class="text-xs text-white/70">{formatSize(record.videoFile.size)}</span>
                                </span>
                            </button>
                            {#if days !== null}
                                {@render expiryBadge(
                                    days,
                                    "absolute start-1.5 top-1.5 rounded-full bg-[#0f1826]/90 px-2 py-0.5 pointer-events-none",
                                )}
                            {/if}
                            {@render actions(
                                record,
                                index,
                                "absolute end-1.5 top-1.5 rounded-md bg-[#0f1826]/80 backdrop-blur-sm",
                            )}
                            {#if confirmingFilename === record.videoFile.filename}
                                <div
                                    role="alertdialog"
                                    aria-label={$LL.recording.deleteConfirm.title()}
                                    class="absolute inset-0 z-10 flex flex-col justify-center gap-3 rounded-lg border border-solid border-danger/45 bg-[#0f1826]/95 p-3.5 text-left"
                                >
                                    <p class="m-0 text-sm font-medium">{$LL.recording.deleteConfirm.title()}</p>
                                    <p class="m-0 text-xs text-white/70">
                                        {$LL.recording.deleteConfirm.irreversible()}
                                    </p>
                                    <div class="flex flex-wrap gap-2">{@render confirmButtons(record, index)}</div>
                                </div>
                            {/if}
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </section>
</div>

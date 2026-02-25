<script lang="ts">
    import { onDestroy, onMount } from "svelte";
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
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
    import RecordingContextMenuContent from "./RecordingContextMenuContent.svelte";
    import { IconRefresh, IconDots } from "@wa-icons";

    const connection: GameScene["connection"] = gameManager.getCurrentGameScene().connection;

    const RECORDINGS_VIEW_STORAGE_KEY = "wa-recordings-view-mode";
    type ViewMode = "list" | "card";

    let viewMode: ViewMode = "list";
    let recordings: NonUndefinedFields<Recording>[] = [];
    let isLoading: boolean = false;
    let isError: boolean = false;

    function setViewMode(mode: ViewMode): void {
        viewMode = mode;
        try {
            localStorage.setItem(RECORDINGS_VIEW_STORAGE_KEY, mode);
        } catch {
            // ignore localStorage errors (e.g. private mode)
        }
    }

    let hoveredRecordIndex: number = -1;
    let thumbnailIndex: number = 1;
    let thumbnailInterval: number | null = null;

    let currentContextMenuRecord: NonUndefinedFields<Recording> | null = null;
    let closeFloatingUi: (() => void) | undefined = undefined;

    function close(): void {
        closeContextMenu();
        $showRecordingList = false;
    }

    function closeContextMenu(): void {
        closeFloatingUi?.();
        closeFloatingUi = undefined;
        currentContextMenuRecord = null;
    }

    function showContextMenu(event: MouseEvent, record: NonUndefinedFields<Recording>): void {
        event.preventDefault();
        event.stopPropagation();

        // If clicking on the same record's menu button, close the menu
        if (closeFloatingUi && currentContextMenuRecord === record) {
            closeContextMenu();
            return;
        }

        // Close any existing menu first
        closeContextMenu();

        const button = event.currentTarget as HTMLElement;
        currentContextMenuRecord = record;

        closeFloatingUi = showFloatingUi(
            button,
            // @ts-ignore See https://github.com/storybookjs/storybook/issues/21884
            RecordingContextMenuContent,
            {
                currentRecord: record,
                connection,
                onDelete: () => handleDelete(record),
                onClose: closeContextMenu,
            },
            {
                placement: "bottom-start",
            },
            8,
            false
        );
    }

    onDestroy(() => {
        closeContextMenu();
    });

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

            closeContextMenu();
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
            const stored = localStorage.getItem(RECORDINGS_VIEW_STORAGE_KEY);
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
                <div class="flex items-center gap-1">
                    <button
                        type="button"
                        class="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/5 p-2 text-inherit transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                        on:click={() => setViewMode(viewMode === "list" ? "card" : "list")}
                        title={viewMode === "list" ? $LL.recording.viewCards() : $LL.recording.viewList()}
                        aria-label={viewMode === "list" ? $LL.recording.viewCards() : $LL.recording.viewList()}
                    >
                        {#if viewMode === "list"}
                            <svg
                                class="h-5 w-5"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true"
                            >
                                <rect width="7" height="7" x="3" y="3" rx="1" />
                                <rect width="7" height="7" x="14" y="3" rx="1" />
                                <rect width="7" height="7" x="14" y="14" rx="1" />
                                <rect width="7" height="7" x="3" y="14" rx="1" />
                            </svg>
                        {:else}
                            <svg
                                class="h-5 w-5"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true"
                            >
                                <line x1="8" y1="6" x2="21" y2="6" />
                                <line x1="8" y1="12" x2="21" y2="12" />
                                <line x1="8" y1="18" x2="21" y2="18" />
                                <line x1="3" y1="6" x2="3.01" y2="6" />
                                <line x1="3" y1="12" x2="3.01" y2="12" />
                                <line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                        {/if}
                    </button>
                    <button
                        class="inline-flex cursor-pointer items-center justify-center rounded-lg border-none bg-white/10 p-2 text-inherit transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                        on:click={() => queryRecordings()}
                        title={$LL.recording.refresh()}
                    >
                        <IconRefresh />
                        <span class="sr-only">{$LL.recording.refresh()}</span>
                    </button>
                    <ButtonClose on:click={() => close()} />
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
                            class="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-xl font-bold text-red-300"
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
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
                            >
                                <path
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
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
                                            <svg
                                                class="h-8 w-8"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                aria-hidden="true"
                                            >
                                                <path d="M8 5v14l11-7L8 5z" />
                                            </svg>
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
                                </button>
                                <button
                                    type="button"
                                    class="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center self-center rounded border-none bg-transparent p-0 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                                    data-testid="recording-context-menu-trigger"
                                    on:click={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        showContextMenu(e, record);
                                    }}
                                    title="Options"
                                    aria-label="Options"
                                >
                                    <IconDots />
                                </button>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <div class="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto pe-0.5 md:grid-cols-3" role="list">
                        {#each recordings as record, index (record.videoFile.filename)}
                            {@const days = getDaysUntilExpiration(record.videoFile.filename)}
                            {@const expiryDateStr = formatExpirationDate(record.videoFile.filename)}
                            <div
                                class="group relative flex min-w-0 flex-col overflow-hidden rounded bg-white/[0.06] transition-all hover:-translate-y-px hover:bg-white/10"
                                role="listitem"
                            >
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
                                            <svg
                                                class="h-10 w-10"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                aria-hidden="true"
                                            >
                                                <path d="M8 5v14l11-7L8 5z" />
                                            </svg>
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
                                    class="absolute top-1.5 right-1.5 z-10 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border-none bg-black/40 p-0 text-white/80 transition-colors hover:bg-black/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                                    data-testid="recording-context-menu-trigger"
                                    on:click={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        showContextMenu(e, record);
                                    }}
                                    title="Options"
                                    aria-label="Options"
                                >
                                    <IconDots />
                                </button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </PopUpContainer>
    </div>
</div>

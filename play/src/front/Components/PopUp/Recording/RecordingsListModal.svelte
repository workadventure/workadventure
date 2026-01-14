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
    import { ADMIN_URL } from "../../../Enum/EnvironmentVariable";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import RecordingContextMenu from "./RecordingContextMenu.svelte";
    import { IconRefresh, IconDots } from "@wa-icons";

    interface ContextMenu {
        show: boolean;
        x: number;
        y: number;
        currentRecord: NonUndefinedFields<Recording> | null;
        buttonElement: HTMLElement | null;
    }

    const connection: GameScene["connection"] = gameManager.getCurrentGameScene().connection;

    let recordings: NonUndefinedFields<Recording>[] = [];
    let isLoading: boolean = false;

    let hoveredRecordIndex: number = -1;
    let thumbnailIndex: number = 1;
    let thumbnailInterval: number | null = null;

    function close(): void {
        $showRecordingList = false;
    }

    let contextMenu: ContextMenu = {
        show: false,
        x: 0,
        y: 0,
        currentRecord: null,
        buttonElement: null,
    };

    function showContextMenu(event: MouseEvent, record: NonUndefinedFields<Recording>): void {
        event.preventDefault();
        event.stopPropagation();

        if (contextMenu.show && contextMenu.currentRecord) {
            contextMenu.show = false;
            return;
        }

        const button = event.currentTarget as HTMLElement;
        const popupContainer = button.closest(".popup-container") as HTMLElement;

        if (!popupContainer) {
            return;
        }

        const buttonRect: DOMRect = button.getBoundingClientRect();
        const containerRect: DOMRect = popupContainer.getBoundingClientRect();

        const relativeX: number = buttonRect.left - containerRect.left;
        const relativeY: number = buttonRect.top - containerRect.top;

        contextMenu = {
            show: true,
            x: relativeX,
            y: relativeY,
            currentRecord: record,
            buttonElement: button,
        };
    }

    function openInNewTab(url: string): void {
        window.open(url, "_blank");
    }

    async function openVideoInNewTab(videoKey: string): Promise<void> {
        if (!connection) {
            console.error("Connection is not available");
            return;
        }
        try {
            const signedUrl = await connection.getSignedUrl(videoKey);
            openInNewTab(signedUrl);
        } catch (error) {
            console.error("Failed to get signed URL for video:", error);
            notificationPlayingStore.playNotification($LL.recording.notification.downloadFailedNotification());
        }
    }

    async function handleDelete(): Promise<void> {
        const videoFile = contextMenu.currentRecord?.videoFile;
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

            contextMenu = {
                ...contextMenu,
                show: false,
            };
            recordings = recordings.filter((record) => record.videoFile?.filename !== videoFile.filename);

            notificationPlayingStore.playNotification($LL.recording.notification.deleteNotification());
        } catch (error) {
            console.error("Failed to delete recording:", error);
            notificationPlayingStore.playNotification($LL.recording.notification.deleteNotification());
        }
    }

    async function queryRecordings(): Promise<void> {
        isLoading = true;
        if (!connection) return;
        const recordingsAnswer = await connection.queryRecordings();
        isLoading = false;
        recordings = recordingsAnswer;
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

    onMount(async () => {
        await queryRecordings();
    });
</script>

<div class="absolute top-0 bottom-0 w-full h-full flex items-center justify-center z-30">
    <div class="w-11/12 lg:w-2/3 relative h-fit">
        <PopUpContainer fullContent={true}>
            <div class="flex flex-col gap-2 w-full">
                <div class="w-full flex justify-between">
                    <button
                        class="btn btn-sm h-fit flex flex-row items-center gap-2 bg-white/10 hover:bg-white/20"
                        on:click={() => queryRecordings()}
                    >
                        {$LL.recording.refresh()}
                        <IconRefresh />
                    </button>
                    <ButtonClose on:click={() => close()} />
                </div>
                <span class="pb-4 text-xl font-bold">
                    {$LL.recording.title()}
                </span>
                <div>
                    {#if isLoading}
                        <div class="w-full flex items-center justify-center p-4">
                            <Spinner />
                        </div>
                    {:else if recordings.length === 0}
                        <p>{$LL.recording.noRecordings()}</p>
                    {:else}
                        <div
                            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-scroll max-h-[50vh]"
                        >
                            {#each recordings as record, index (record.videoFile.filename)}
                                <div
                                    class="flex flex-col flex-wrap items-center justify-between gap-0 w-full aspect-video relative rounded-md bg-gradient-to-t to-50% group-hover:to-10% to-transparent from-secondary-900 group cursor-pointer"
                                    role="button"
                                    tabindex="0"
                                    on:mouseenter={() => startThumbnailCycle(index, record.thumbnails)}
                                    on:mouseleave={stopThumbnailCycle}
                                    on:click={() => openVideoInNewTab(record.videoFile.key)}
                                    on:keydown={(e) => {
                                        if (e.key === "Enter") {
                                            openVideoInNewTab(record.videoFile.key).catch((e) => {
                                                console.error("Error opening video in new tab:", e);
                                            });
                                        }
                                    }}
                                    data-testid="recording-item-{index}"
                                >
                                    <img
                                        class="absolute w-full h-full top-0 left-0 object-cover rounded-md z-[-1]"
                                        src={hoveredRecordIndex === index
                                            ? record.thumbnails[thumbnailIndex]?.url
                                            : record.thumbnails[1]?.url}
                                        alt="Recording thumbnail"
                                    />
                                    <div class="w-full flex flex-row items-start justify-between p-2">
                                        {#if ADMIN_URL}
                                            <div class="text-xs text-black bg-white/80 rounded px-2 py-1">
                                                {$LL.recording.expireIn({
                                                    days: getDaysUntilExpiration(record.videoFile.filename),
                                                    s:
                                                        getDaysUntilExpiration(record.videoFile.filename) !== 1
                                                            ? "s"
                                                            : "",
                                                })}
                                            </div>
                                        {/if}

                                        <button
                                            data-testid="recording-context-menu-trigger"
                                            class="btn btn-contrast/80 hover:bg-contrast/80 btn-xs cursor-pointer hover:!opacity-100 group-hover:opacity-40 aspect-square context-menu-trigger"
                                            on:click={(e) => {
                                                e.stopPropagation();
                                                showContextMenu(e, record);
                                            }}
                                        >
                                            <IconDots />
                                        </button>
                                    </div>

                                    <span class="p-2 font-bold group-hover:opacity-20">{record.videoFile.filename}</span
                                    >
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
            <div slot="buttons" class="flex flex-row justify-center w-full">
                <button
                    class="btn btn-lg btn-secondary w-full m-auto"
                    data-testid="close-recording-modal"
                    on:click={close}
                >
                    {$LL.recording.close()}
                </button>
            </div>
            <RecordingContextMenu
                bind:show={contextMenu.show}
                y={contextMenu.y}
                currentRecord={contextMenu.currentRecord}
                on:delete={handleDelete}
                buttonElement={contextMenu.buttonElement}
                {connection}
            />
        </PopUpContainer>
    </div>
</div>

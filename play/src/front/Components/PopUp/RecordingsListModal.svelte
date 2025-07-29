<script>
    import PopUpContainer from "./PopUpContainer.svelte";
    import { onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import Spinner from "../Icons/Spinner.svelte";
    import {IconRefresh} from "@wa-icons";
    import DownloadIcon from "../Icons/DownloadIcon.svelte"
    import { showRecordingList } from "../../Stores/RecordingStore";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { ADMIN_URL } from "../../Enum/EnvironmentVariable";

    const connection = gameManager.getCurrentGameScene().connection;

    let recordings = [];
    let isLoading = false;

    let hoveredRecordIndex = -1;
    let thumbnailIndex = 1;
    let thumbnailInterval = null;

    function close() {
        $showRecordingList = false;
    }

    async function downloadFile(url, filename) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Erreur lors du téléchargement:', error);
        }
    }

    async function queryRecordings() {
        isLoading = true;
        const recordingsAnswer = (await connection.queryRecordings())
        console.trace("🐞🐞🐞 Recordings fetched:", recordingsAnswer.recordings);
        isLoading = false;
        recordings = recordingsAnswer.recordings || [];
    }

    function startThumbnailCycle(recordIndex, thumbnails) {
        if (thumbnails.length <= 2) return;

        hoveredRecordIndex = recordIndex;
        thumbnailIndex = 1;

        thumbnailInterval = setInterval(() => {
            thumbnailIndex = thumbnailIndex + 1;
            if (thumbnailIndex >= thumbnails.length) {
                thumbnailIndex = 1;
            }
        }, 500);
    }

    function stopThumbnailCycle() {
        if (thumbnailInterval) {
            clearInterval(thumbnailInterval);
            thumbnailInterval = null;
        }
        hoveredRecordIndex = -1;
        thumbnailIndex = 1;
    }

    function getDaysUntilExpiration(filename) {
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

    onMount( async () => {
        await queryRecordings();
    });


</script>

<div class="absolute top-0 bottom-0 w-full h-full flex items-center justify-center">
    <div class="w-11/12 lg:w-2/3  relative h-fit">
        <PopUpContainer fullContent={true}>
            <div class="flex flex-col gap-2 w-full">
                <div class="w-full flex justify-between">
                    <button class="btn btn-sm h-fit flex flex-row items-center gap-2 bg-white/10 hover:bg-white/20" on:click={() => queryRecordings()}>
                        {$LL.recording.refresh()}
                        <IconRefresh/>
                    </button>
                    <ButtonClose on:click={() => close()} />
                </div>
                <span class="p-4 text-xl font-bold">
                    {$LL.recording.title()}
                </span>
                <div>
                    {#if isLoading}
                        <div class="w-full flex items-center justify-center p-4">
                            <Spinner/>
                        </div>
                    {:else if recordings.length === 0}
                        <p>{$LL.recording.noRecordings()}</p>
                    {:else }
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  gap-4 overflow-y-scroll max-h-[50vh]">
                            {#each recordings as record, index (record.videoFile.filename)}
                                <div class="flex flex-col flex-wrap items-center justify-between gap-0 w-full h-52 lg:h-36 relative rounded-md bg-gradient-to-t to-50% group-hover:to-10% to-transparent from-secondary-900 group"
                                     on:mouseenter={() => startThumbnailCycle(index, record.thumbnails)}
                                     on:mouseleave={stopThumbnailCycle}
                                >
                                    <img class="absolute w-full h-full top-0 left-0 object-cover rounded-md z-[-1]"
                                         src={hoveredRecordIndex === index ? record.thumbnails[thumbnailIndex]?.url : record.thumbnails[1]?.url}
                                         alt="Recording thumbnail"/>
                                    <div class="w-full flex flex-row items-end justify-between p-2">
                                        {#if ADMIN_URL}
                                            <div class="text-xs text-black bg-white/80 rounded px-2 py-1">
                                                {$LL.recording.expireIn({
                                                    days: getDaysUntilExpiration(record.videoFile.filename),
                                                    s: getDaysUntilExpiration(record.videoFile.filename) !== 1 ? 's' : ''
                                                })}
                                            </div>
                                        {/if}
                                        <button
                                                class="btn btn-secondary hover:bg-secondary btn-sm cursor-pointer hover:!opacity-100 group-hover:opacity-40"
                                                on:click={() => downloadFile(record.videoFile.url, record.videoFile.filename)}
                                        >
                                            <DownloadIcon />
                                            {$LL.recording.download()}
                                        </button>
                                    </div>

                                    <span class="p-2 font-bold group-hover:opacity-20">{record.videoFile.filename}</span>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
            <div slot="buttons" class="flex flex-row justify-center w-full">
                <button class="btn btn-lg btn-secondary w-full m-auto" on:click={close}>
                    {$LL.recording.close()}
                </button>
            </div>
        </PopUpContainer>
    </div>
</div>
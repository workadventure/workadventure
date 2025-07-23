<script>
    import PopUpContainer from "./PopUpContainer.svelte";
    import { onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import Spinner from "../Icons/Spinner.svelte";
    import {IconRefresh} from "@wa-icons";
    import DownloadIcon from "../Icons/DownloadIcon.svelte"
    import { showRecordingList } from "../../Stores/RecordingStore";

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

    onMount( async () => {
        await queryRecordings();
    });


</script>

<div class="absolute top-0 bottom-0 w-full h-full flex items-center justify-center">
    <div class="w-11/12 lg:w-2/3  relative h-fit">
        <PopUpContainer fullContent={true}>
            <div class="flex flex-col gap-2 w-full">
                <div class="w-full flex justify-end">
                    <button class="btn btn-sm flex flex-row items-center gap-2 bg-white/10 hover:bg-white/20" on:click={() => queryRecordings()}>
                        Refresh
                        <IconRefresh/>
                    </button>
                </div>
                <span class="p-4 text-xl font-bold">
                    Your recording list.
                </span>
                <div>
                    {#if isLoading}
                        <div class="w-full flex items-center justify-center p-4">
                            <Spinner/>
                        </div>
                    {:else if recordings.length === 0}
                        <p>No recordings found</p>
                    {:else }
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-scroll max-h-[50vh]">
                            {#each recordings as record, index}
                                <div class="flex flex-col flex-wrap items-center justify-between gap-0 w-full h-40 relative rounded-md bg-gradient-to-t to-50% group-hover:to-10% to-transparent from-secondary-900 group"
                                     on:mouseenter={() => startThumbnailCycle(index, record.thumbnails)}
                                     on:mouseleave={stopThumbnailCycle}
                                >
                                    <img class="absolute w-full h-full top-0 left-0 object-cover rounded-md z-[-1]"
                                         src={hoveredRecordIndex === index ? record.thumbnails[thumbnailIndex]?.url : record.thumbnails[1]?.url}
                                         alt="Recording thumbnail"/>
                                    <div class="w-full flex flex-row items-center justify-end p-2">
                                        <button
                                                class="btn btn-secondary hover:bg-secondary btn-sm cursor-pointer hover:!opacity-100 group-hover:opacity-40"
                                                on:click={() => downloadFile(record.videoFile.url, record.videoFile.filename)}
                                        >
                                            <DownloadIcon />
                                            Télécharger
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
                    close
                </button>
            </div>
        </PopUpContainer>
    </div>
</div>
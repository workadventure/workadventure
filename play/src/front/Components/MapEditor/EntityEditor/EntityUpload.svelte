<script lang="ts">
    import { IconCloudUpload, IconLoader } from "@tabler/icons-svelte";
    import { UploadEntityMessage, UploadEntityMessage_Direction } from "@workadventure/messages";
    import { onDestroy } from "svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { mapEditorEntityUploadEventStore } from "../../../Stores/MapEditorStore";

    let files: FileList | undefined = undefined;
    let loadingFileUpload = false;
    let fileInput: HTMLInputElement;
    let dropZoneRef: HTMLDivElement;

    $: {
        if (files) {
            processFileToUpload(files.item(0)!).catch((error) => console.error(error));
        }
    }

    const mapEditorEntityUploadEventStoreUnsubscriber = mapEditorEntityUploadEventStore.subscribe(
        (uploadEntityMessage) => {
            completeAndResetUpload(uploadEntityMessage);
        }
    );

    function completeAndResetUpload(uploadEntityMessage: UploadEntityMessage | undefined) {
        if (uploadEntityMessage === undefined && files !== undefined) {
            initFileUpload();
        }
    }

    async function processFileToUpload(fileToUpload: File) {
        loadingFileUpload = true;
        const fileBuffer = await fileToUpload.arrayBuffer();
        const fileAsUint8Array = new Uint8Array(fileBuffer);
        mapEditorEntityUploadEventStore.set({
            file: fileAsUint8Array,
            direction: UploadEntityMessage_Direction.Down,
            name: fileToUpload.name,
            tags: [],
            imagePath: fileToUpload.name,
            color: "",
        });
    }

    function initFileUpload() {
        files = undefined;
        fileInput.value = "";
        mapEditorEntityUploadEventStore.set(undefined);
        setTimeout(() => (loadingFileUpload = false), 500);
    }

    function dropHandler(event: DragEvent) {
        const { files: filesFromDropEvent } = event.dataTransfer ?? {};
        if (filesFromDropEvent) {
            if (filesFromDropEvent.length > 1) {
                console.error("Only one file is permitted");
            } else {
                files = filesFromDropEvent;
                processFileToUpload(filesFromDropEvent.item(0)!).catch((error) => console.error(error));
            }
        }
        dropZoneRef.classList.remove("tw-border-cyan-400");
    }

    onDestroy(() => {
        mapEditorEntityUploadEventStoreUnsubscriber();
    });
</script>

<div>
    <p class="tw-m-0">{$LL.mapEditor.entityEditor.uploadEntity.title()}</p>
    <p class="tw-opacity-50">{$LL.mapEditor.entityEditor.uploadEntity.description()}</p>
    <div
        on:drop|preventDefault|stopPropagation={dropHandler}
        on:dragover|preventDefault={() => dropZoneRef.classList.add("tw-border-cyan-400")}
        on:dragleave|preventDefault={() => dropZoneRef.classList.remove("tw-border-cyan-400")}
        bind:this={dropZoneRef}
        class="hover:tw-cursor-pointer tw-h-32 tw-flex tw-flex-col tw-border tw-border-dashed tw-rounded-md tw-items-center tw-justify-center tw-bg-white tw-bg-opacity-10"
    >
        <input
            id="upload"
            class="tw-hidden"
            type="file"
            accept="image/png"
            bind:files
            bind:this={fileInput}
            data-testid="uploadCustomAsset"
        />
        {#if loadingFileUpload}
            <IconLoader class="tw-animate-spin" />
        {:else}
            <label
                class="tw-flex tw-flex-row tw-gap-2 tw-min-w-full tw-p-2 tw-m-0 tw-items-center tw-justify-center"
                for="upload"
            >
                <IconCloudUpload size={32} stroke={1} />
                <div>
                    <p class="hover:tw-cursor-pointer tw-m-0">
                        {$LL.mapEditor.entityEditor.uploadEntity.dragDrop()}
                        <span class="hover:tw-cursor-pointer tw-underline tw-text-contrast-300"
                            >{$LL.mapEditor.entityEditor.uploadEntity.chooseFile()}</span
                        >
                    </p>
                    <p class="tw-text-xs tw-m-0 tw-opacity-50">PNG, JPG, WebP</p>
                </div></label
            >
        {/if}
    </div>
</div>

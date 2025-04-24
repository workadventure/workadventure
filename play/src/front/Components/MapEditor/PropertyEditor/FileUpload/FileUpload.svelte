<script lang="ts">
    import { UploadFileMessage } from "@workadventure/messages";
    import { onDestroy } from "svelte";
    import { v4 as uuidv4 } from "uuid";
    import { Direction, FILE_UPLOAD_SUPPORTED_FORMATS_FRONT, EntityPrefab } from "@workadventure/map-editor";
    import { get } from "svelte/store";
    import LL from "../../../../../i18n/i18n-svelte";
    import { mapEditorFileUploadEventStore, selectCategoryStore } from "../../../../Stores/MapEditorStore";
    import { IconCloudUpload } from "@wa-icons";

    export let files: FileList | undefined = undefined;
    let dropZoneRef: HTMLDivElement;
    let fileToUpload: EntityPrefab | undefined = undefined;
    let errorOnFile: string | undefined;
    let tagUploadInProcess: string | undefined;

    const BASIC_TYPE = "Custom";
    const filesUploadFormat = FILE_UPLOAD_SUPPORTED_FORMATS_FRONT.split(",").map(
        (format) => format.trim().split("/")[1]
    );

    $: {
        if (files) {
            const file = files.item(0);
            if (file && isASupportedFormat(file.type)) {
                fileToUpload = {
                    collectionName: "c",
                    name: file.name,
                    imagePath: URL.createObjectURL(file),
                    id: uuidv4(),
                    direction: Direction.Down,
                    tags: [],
                    color: "",
                    type: BASIC_TYPE,
                };
            } else {
                console.error("File format not supported");
                errorOnFile = $LL.mapEditor.properties.openPdfProperties.uploadFile.errorOnFileFormat();
            }
        }
    }

    const mapEditorEntityUploadEventStoreUnsubscriber = mapEditorFileUploadEventStore.subscribe((uploadFileMessage) => {
        completeAndResetUpload(uploadFileMessage);
    });

    function isASupportedFormat(format: string): boolean {
        return format.trim().length > 0 && FILE_UPLOAD_SUPPORTED_FORMATS_FRONT.includes(format);
    }
    function completeAndResetUpload(uploadFileMessage: UploadFileMessage | undefined) {
        if (uploadFileMessage === undefined && files !== undefined) {
            initFileUpload();
        }

        // At the end, open the categorie of image uploaded
        selectCategoryStore.set(tagUploadInProcess);
    }

    function initFileUpload() {
        files = undefined;
        fileToUpload = undefined;
        mapEditorFileUploadEventStore.set(undefined);
        errorOnFile = undefined;
    }

    function dropHandler(event: DragEvent) {
        const { files: filesFromDropEvent } = event.dataTransfer ?? {};
        if (filesFromDropEvent) {
            if (filesFromDropEvent.length > 1) {
                console.error("Only one file is permitted");
                errorOnFile = $LL.mapEditor.properties.openPdfProperties.uploadFile.errorOnFileNumber();
            } else {
                if (isASupportedFormat(filesFromDropEvent.item(0)?.type ?? "")) {
                    files = filesFromDropEvent;
                } else {
                    console.error("File format not supported");
                    errorOnFile = $LL.mapEditor.properties.openPdfProperties.uploadFile.errorOnFileFormat();
                }
            }
        }

        dropZoneRef.classList.remove("border-cyan-400");
    }

    async function setFileUploadStore() {
        const file = files?.item(0);
        if (fileToUpload && file) {
            const fileBuffer = await file.arrayBuffer();
            const fileAsUint8Array = new Uint8Array(fileBuffer);
            const generatedId = uuidv4();
            tagUploadInProcess = fileToUpload.tags && fileToUpload.tags.length > 0 ? fileToUpload.tags[0] : BASIC_TYPE;
            console.log("tagUploadInProcess", tagUploadInProcess, get(mapEditorFileUploadEventStore));
            mapEditorFileUploadEventStore.set({
                id: generatedId,
                file: fileAsUint8Array,
                name: fileToUpload.name,
                propertyId: fileToUpload.id,
            });
            console.log("mapEditorEntityUploadEventStore", get(mapEditorFileUploadEventStore));
        }
    }

    onDestroy(() => {
        mapEditorEntityUploadEventStoreUnsubscriber();
    });
</script>

<div class="no-padding">
    <p class="m-0">{$LL.mapEditor.properties.openPdfProperties.uploadFile.title()}</p>
    <p class="opacity-50">{$LL.mapEditor.properties.openPdfProperties.uploadFile.description()}</p>
    <div
        on:drop|preventDefault|stopPropagation={dropHandler}
        on:dragover|preventDefault={() => dropZoneRef.classList.add("border-cyan-400")}
        on:dragleave|preventDefault={() => dropZoneRef.classList.remove("border-cyan-400")}
        bind:this={dropZoneRef}
        class="hover:cursor-pointer h-32 flex flex-col border border-dashed rounded-md items-center justify-center bg-white bg-opacity-10"
    >
        <input
            id="upload"
            class="hidden"
            type="file"
            accept={FILE_UPLOAD_SUPPORTED_FORMATS_FRONT}
            bind:files
            data-testid="uploadCustomAsset"
            on:change={setFileUploadStore}
        />

        <label class="flex flex-row gap-2 min-w-full p-2 m-0 items-center justify-center" for="upload">
            <IconCloudUpload font-size={32} />
            <span class="flex flex-col">
                <span class="hover:cursor-pointer">
                    {$LL.mapEditor.properties.openPdfProperties.uploadFile.dragDrop()}
                    <span class="hover:cursor-pointer underline text-contrast-300"
                        >{$LL.mapEditor.properties.openPdfProperties.uploadFile.chooseFile()}</span
                    >
                </span>
                <span class="text-xs m-0 opacity-50">{filesUploadFormat.join(", ")}</span>
                {#if errorOnFile}
                    <span class="text-xx text-red-500">{errorOnFile}</span>
                {/if}
            </span></label
        >
    </div>
</div>

<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { v4 as uuidv4 } from "uuid";
    import { FILE_UPLOAD_SUPPORTED_FORMATS_FRONT, OpenPdfPropertyData } from "@workadventure/map-editor";
    import { UploadFileMessage } from "@workadventure/messages";
    import { get } from "svelte/store";
    import ButtonClose from "../../../Input/ButtonClose.svelte";
    import { gameManager } from "../../../../Phaser/Game/GameManager";
    import { UploadFileFrontCommand } from "../../../../Phaser/Game/MapEditor/Commands/File/UploadFileFrontCommand";
    import LL from "../../../../../i18n/i18n-svelte";
    import { gameSceneStore } from "../../../../Stores/GameSceneStore";
    import { IconCloudUpload } from "@wa-icons";

    export let property: OpenPdfPropertyData;

    let selectedFile: File | undefined = undefined;
    let files: FileList | undefined = undefined;
    let dropZoneRef: HTMLDivElement;
    let errorOnFile: string | undefined;
    let fileToUpload: UploadFileMessage | undefined = undefined;

    const dispatch = createEventDispatcher<{
        change: string | null | undefined;
        deleteFile: undefined;
    }>();

    const filesUploadFormat = FILE_UPLOAD_SUPPORTED_FORMATS_FRONT.split(",").map(
        (format) => format.trim().split("/")[1]
    );

    $: {
        if (files) {
            const file = files.item(0);
            if (file && isASupportedFormat(file.type)) {
                selectedFile = file;
                void handleFileChange();
            } else {
                console.error("File format not supported");
                errorOnFile = $LL.mapEditor.properties.openPdfProperties.uploadFile.errorOnFileFormat();
            }
        }
    }

    async function handleFileChange(): Promise<void> {
        if (!selectedFile) {
            return;
        }
        const fileBuffer = await selectedFile.arrayBuffer();
        const fileAsUint8Array = new Uint8Array(fileBuffer);
        const generatedId = uuidv4();
        fileToUpload = {
            id: generatedId,
            file: fileAsUint8Array,
            name: selectedFile.name,
            propertyId: property.id,
        };

        const roomConnection = gameManager.getCurrentGameScene()?.connection;
        if (roomConnection === undefined) throw new Error("No connection");
        const uploadFileCommand = new UploadFileFrontCommand(fileToUpload);
        uploadFileCommand.emitEvent(roomConnection);

        const fileName = selectedFile.name.split(".")[0];
        const fileExt = selectedFile.name.split(".")[1];

        const fileUrl = `${get(gameSceneStore)?.room.mapStorageUrl?.toString()}file/${fileName}-${
            property.id
        }.${fileExt}`;

        property.name = selectedFile.name;
        property.link = fileUrl;
        dispatch("change");
    }

    function isASupportedFormat(format: string): boolean {
        return format.trim().length > 0 && FILE_UPLOAD_SUPPORTED_FORMATS_FRONT.includes(format);
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
</script>

<div class="no-padding">
    {#if !property.link}
        <p class="m-0">{$LL.mapEditor.properties.openPdfProperties.uploadFile.title()}</p>
        <p class="opacity-50">{$LL.mapEditor.properties.openPdfProperties.uploadFile.description()}</p>
        <div
            on:drop|preventDefault|stopPropagation={dropHandler}
            on:dragover|preventDefault={() => dropZoneRef.classList.add("border-cyan-400")}
            on:dragleave|preventDefault={() => dropZoneRef.classList.remove("border-cyan-400")}
            bind:this={dropZoneRef}
            class="hover:cursor-pointer h-32 flex flex-col border border-dashed rounded-md items-center justify-center bg-white bg-opacity-10"
        >
            <input id="upload" class="hidden" type="file" accept={FILE_UPLOAD_SUPPORTED_FORMATS_FRONT} bind:files />

            <label class="flex flex-row gap-2 min-w-full p-2 m-0 items-center justify-center" for="upload">
                <IconCloudUpload font-size={32} />
                <span class="flex flex-col">
                    <span class="hover:cursor-pointer">
                        {$LL.mapEditor.properties.openPdfProperties.uploadFile.dragDrop()}
                        <span class="hover:cursor-pointer underline text-contrast-300" id="chooseUpload"
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
    {:else}
        <div class="flex flex-row gap-2 min-w-full p-2 m-0 items-center justify-between">
            <div>{property.name}</div>
            <ButtonClose
                dataTestId="closeFileUpload"
                bgColor="bg-white/10"
                hoverColor="bg-white/20"
                textColor="text-white"
                on:click={() => {
                    selectedFile = undefined;
                    dispatch("deleteFile");
                    dispatch("change");
                }}
            />
        </div>
    {/if}
</div>

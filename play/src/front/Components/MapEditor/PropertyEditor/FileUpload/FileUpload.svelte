<script lang="ts">
    import { v4 as uuidv4 } from "uuid";
    import type { OpenFilePropertyData } from "@workadventure/map-editor";
    import { FILE_UPLOAD_SUPPORTED_FORMATS_FRONT } from "@workadventure/map-editor";
    import type { UploadFileMessage } from "@workadventure/messages";
    import { get } from "svelte/store";
    import * as Sentry from "@sentry/svelte";
    import { GRPC_MAX_MESSAGE_SIZE } from "../../../../Enum/EnvironmentVariable";
    import ButtonClose from "../../../Input/ButtonClose.svelte";
    import { gameManager } from "../../../../Phaser/Game/GameManager";
    import { UploadFileFrontCommand } from "../../../../Phaser/Game/MapEditor/Commands/File/UploadFileFrontCommand";
    import LL from "../../../../../i18n/i18n-svelte";
    import { gameSceneStore } from "../../../../Stores/GameSceneStore";
    import { IconCloudUpload } from "@wa-icons";

    interface Props {
        property: OpenFilePropertyData;
        onchange?: () => void;
        ondeleteFile?: () => void;
    }

    let { property = $bindable(), onchange, ondeleteFile }: Props = $props();

    let files: FileList | undefined = $state(undefined);
    let dropZoneRef: HTMLDivElement | undefined = $state();
    let errorOnFile: string | undefined = $state();
    let fileToUpload: UploadFileMessage | undefined = undefined;
    const BYTES_TO_MB = 1024 * 1024;

    const filesUploadFormat = FILE_UPLOAD_SUPPORTED_FORMATS_FRONT.split(",").map(
        (format) => format.trim().split("/")[1],
    );

    $effect(() => {
        if (files) {
            const file = files.item(0);
            if (file && isASupportedFormat(file.type)) {
                handleFileChange(file).catch((error) => {
                    console.error("Error in handleFileChange:", error);
                    Sentry.captureException(error);
                });
            } else {
                console.error("File format not supported");
                errorOnFile = $LL.mapEditor.properties.openFile.uploadFile.errorOnFileFormat();
            }
        }
    });

    async function handleFileChange(file: File): Promise<void> {
        if (file.size > GRPC_MAX_MESSAGE_SIZE) {
            errorOnFile = $LL.mapEditor.properties.openFile.uploadFile.errorOnFileSize({
                size: GRPC_MAX_MESSAGE_SIZE / BYTES_TO_MB,
            });
            return;
        }

        const fileBuffer = await file.arrayBuffer();
        const fileAsUint8Array = new Uint8Array(fileBuffer);
        const generatedId = uuidv4();
        fileToUpload = {
            id: generatedId,
            file: fileAsUint8Array,
            name: file.name,
            propertyId: property.id,
        };

        const roomConnection = gameManager.getCurrentGameScene()?.connection;
        if (roomConnection === undefined) throw new Error("No connection");

        const mapStorageUrl = get(gameSceneStore)?.room.mapStorageUrl;
        if (!mapStorageUrl) {
            throw new Error("No map storage URL found");
        }

        const uploadFileCommand = new UploadFileFrontCommand(fileToUpload);
        uploadFileCommand.emitEvent(roomConnection);

        const lastDot = file.name.lastIndexOf(".");
        const fileName = file.name.slice(0, lastDot);
        const fileExt = file.name.slice(lastDot + 1);

        const fileUrl = new URL(`private/files/${fileName}-${property.id}.${fileExt}`, mapStorageUrl).toString();

        property.name = file.name;
        property.link = fileUrl;
        onchange?.();
    }

    function isASupportedFormat(format: string): boolean {
        return format.trim().length > 0 && FILE_UPLOAD_SUPPORTED_FORMATS_FRONT.includes(format);
    }

    function dropHandler(event: DragEvent) {
        const { files: filesFromDropEvent } = event.dataTransfer ?? {};
        if (filesFromDropEvent) {
            if (filesFromDropEvent.length > 1) {
                console.error("Only one file is permitted");
                errorOnFile = $LL.mapEditor.properties.openFile.uploadFile.errorOnFileNumber();
            } else {
                if (isASupportedFormat(filesFromDropEvent.item(0)?.type ?? "")) {
                    files = filesFromDropEvent;
                } else {
                    console.error("File format not supported");
                    errorOnFile = $LL.mapEditor.properties.openFile.uploadFile.errorOnFileFormat();
                }
            }
        }

        dropZoneRef?.classList.remove("border-cyan-400");
    }
</script>

<div class="p-1 bg-white/10 rounded-md flex flex-col gap-2">
    {#if !property.link}
        <p class="m-0">{$LL.mapEditor.properties.openFile.uploadFile.title()}</p>
        <p class="opacity-50">{$LL.mapEditor.properties.openFile.uploadFile.description()}</p>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            ondrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                dropHandler(event);
            }}
            ondragover={(event) => {
                event.preventDefault();
                dropZoneRef?.classList.add("border-cyan-400");
            }}
            ondragleave={(event) => {
                event.preventDefault();
                dropZoneRef?.classList.remove("border-cyan-400");
            }}
            bind:this={dropZoneRef}
            class="hover:cursor-pointer h-32 flex flex-col border border-dashed rounded-md items-center justify-center bg-white bg-opacity-10"
        >
            <input id="upload" class="hidden" type="file" accept={FILE_UPLOAD_SUPPORTED_FORMATS_FRONT} bind:files />

            <label class="flex flex-row gap-2 min-w-full p-2 m-0 items-center justify-center" for="upload">
                <IconCloudUpload font-size={32} />
                <span class="flex flex-col">
                    <span class="hover:cursor-pointer">
                        {$LL.mapEditor.properties.openFile.uploadFile.dragDrop()}
                        <span class="hover:cursor-pointer underline text-contrast-300" id="chooseUpload"
                            >{$LL.mapEditor.properties.openFile.uploadFile.chooseFile()}</span
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
                size="xs"
                onclick={() => {
                    files = undefined;
                    ondeleteFile?.();
                    onchange?.();
                }}
            />
        </div>
    {/if}
</div>

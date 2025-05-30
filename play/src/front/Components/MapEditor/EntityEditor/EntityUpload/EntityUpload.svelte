<script lang="ts">
    import { CustomEntityDirection, UploadEntityMessage } from "@workadventure/messages";
    import { onDestroy } from "svelte";
    import { v4 as uuidv4 } from "uuid";
    import { Direction, ENTITY_UPLOAD_SUPPORTED_FORMATS_FRONT, EntityPrefab } from "@workadventure/map-editor";
    import LL from "../../../../../i18n/i18n-svelte";
    import { mapEditorEntityUploadEventStore, selectCategoryStore } from "../../../../Stores/MapEditorStore";
    import CustomEntityEditionForm from "../CustomEntityEditionForm/CustomEntityEditionForm.svelte";
    import { IconCloudUpload } from "@wa-icons";

    let files: FileList | undefined = undefined;
    let dropZoneRef: HTMLDivElement;
    let customEntityToUpload: EntityPrefab | undefined = undefined;
    let errorOnFile: string | undefined;
    let tagUploadInProcess: string | undefined;

    const BASIC_TYPE = "Custom";

    $: {
        if (files) {
            const file = files.item(0);
            if (file && isASupportedFormat(file.type)) {
                customEntityToUpload = {
                    collectionName: "custom entities",
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
                errorOnFile = $LL.mapEditor.entityEditor.uploadEntity.errorOnFileFormat();
            }
        }
    }

    const mapEditorEntityUploadEventStoreUnsubscriber = mapEditorEntityUploadEventStore.subscribe(
        (uploadEntityMessage) => {
            completeAndResetUpload(uploadEntityMessage);
        }
    );

    function isASupportedFormat(format: string): boolean {
        return format.trim().length > 0 && ENTITY_UPLOAD_SUPPORTED_FORMATS_FRONT.includes(format);
    }
    function completeAndResetUpload(uploadEntityMessage: UploadEntityMessage | undefined) {
        if (uploadEntityMessage === undefined && files !== undefined) {
            initFileUpload();
        }

        // At the end, open the categorie of image uploaded
        selectCategoryStore.set(tagUploadInProcess);
    }

    async function processFileToUpload(customEditedEntity: EntityPrefab) {
        const fileToUpload = files?.item(0);
        if (fileToUpload) {
            const fileBuffer = await fileToUpload.arrayBuffer();
            const fileAsUint8Array = new Uint8Array(fileBuffer);
            const generatedId = uuidv4();
            tagUploadInProcess =
                customEditedEntity.tags && customEditedEntity.tags.length > 0 ? customEditedEntity.tags[0] : BASIC_TYPE;

            mapEditorEntityUploadEventStore.set({
                id: generatedId,
                file: fileAsUint8Array,
                direction: CustomEntityDirection.Down,
                name: customEditedEntity.name,
                tags: customEditedEntity.tags,
                imagePath: `${generatedId}-${fileToUpload.name}`,
                collisionGrid: customEditedEntity.collisionGrid,
                depthOffset: customEditedEntity.depthOffset,
                color: "",
            });
        }
    }

    function initFileUpload() {
        files = undefined;
        customEntityToUpload = undefined;
        mapEditorEntityUploadEventStore.set(undefined);
        errorOnFile = undefined;
    }

    function dropHandler(event: DragEvent) {
        const { files: filesFromDropEvent } = event.dataTransfer ?? {};
        if (filesFromDropEvent) {
            if (filesFromDropEvent.length > 1) {
                console.error("Only one file is permitted");
                errorOnFile = $LL.mapEditor.entityEditor.uploadEntity.errorOnFileNumber();
            } else {
                if (isASupportedFormat(filesFromDropEvent.item(0)?.type ?? "")) {
                    files = filesFromDropEvent;
                } else {
                    console.error("File format not supported");
                    errorOnFile = $LL.mapEditor.entityEditor.uploadEntity.errorOnFileFormat();
                }
            }
        }
        dropZoneRef.classList.remove("border-cyan-400");
    }

    onDestroy(() => {
        mapEditorEntityUploadEventStoreUnsubscriber();
    });
</script>

{#if customEntityToUpload}
    <div class="absolute top-0 left-0 w-full bg-dark-blue/95 backdrop-blur-md p-8 h-full overflow-auto">
        <CustomEntityEditionForm
            isUploadForm
            customEntity={customEntityToUpload}
            on:closeForm={initFileUpload}
            on:applyEntityModifications={({ detail: customModifiedEntity }) =>
                processFileToUpload(customModifiedEntity)}
        />
    </div>
{:else}
    <div class="no-padding">
        <p class="m-0">{$LL.mapEditor.entityEditor.uploadEntity.title()}</p>
        <p class="opacity-50">{$LL.mapEditor.entityEditor.uploadEntity.description()}</p>
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
                accept={ENTITY_UPLOAD_SUPPORTED_FORMATS_FRONT}
                bind:files
                data-testid="uploadCustomAsset"
            />

            <label class="flex flex-row gap-2 min-w-full p-2 m-0 items-center justify-center" for="upload">
                <IconCloudUpload font-size={32} />
                <span class="flex flex-col">
                    <span class="hover:cursor-pointer">
                        {$LL.mapEditor.entityEditor.uploadEntity.dragDrop()}
                        <span class="hover:cursor-pointer underline text-contrast-300"
                            >{$LL.mapEditor.entityEditor.uploadEntity.chooseFile()}</span
                        >
                    </span>
                    <span class="text-xs m-0 opacity-50">PNG, JPG, WebP</span>
                    {#if errorOnFile}
                        <span class="text-xx text-red-500">{errorOnFile}</span>
                    {/if}
                </span></label
            >
        </div>
    </div>
{/if}

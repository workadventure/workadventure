<script lang="ts">
    import { IconCloudUpload } from "@tabler/icons-svelte";
    import { CustomEntityDirection, UploadEntityMessage } from "@workadventure/messages";
    import { onDestroy } from "svelte";
    import { v4 as uuidv4 } from "uuid";
    import { Direction, EntityPrefab } from "@workadventure/map-editor";
    import LL from "../../../../../i18n/i18n-svelte";
    import { mapEditorEntityUploadEventStore } from "../../../../Stores/MapEditorStore";
    import EntityEditionUploadForm from "./EntityEditionUploadForm.svelte";

    let files: FileList | undefined = undefined;
    let dropZoneRef: HTMLDivElement;
    let customEntityToUpload: EntityPrefab | undefined = undefined;

    $: {
        if (files) {
            customEntityToUpload = {
                collectionName: "custom entities",
                name:files.item(0)!.name,
                imagePath: URL.createObjectURL(files.item(0)!),
                id: uuidv4(),
                direction: Direction.Down,
                tags: [],
                color: "",
                type: "Custom",
            };
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

    async function processFileToUpload(customEditedEntity: EntityPrefab) {
        const fileToUpload = files?.item(0);
        if (fileToUpload) {
            const fileBuffer = await fileToUpload.arrayBuffer();
            const fileAsUint8Array = new Uint8Array(fileBuffer);
            mapEditorEntityUploadEventStore.set({
                id: uuidv4(),
                file: fileAsUint8Array,
                direction: CustomEntityDirection.Down,
                name: customEditedEntity.name,
                tags: customEditedEntity.tags,
                imagePath: fileToUpload.name,
                collisionGrid: customEditedEntity.collisionGrid,
                color: "",
            });
        }
    }

    function initFileUpload() {
        files = undefined;
        customEntityToUpload = undefined;
        mapEditorEntityUploadEventStore.set(undefined);
    }

    function dropHandler(event: DragEvent) {
        const { files: filesFromDropEvent } = event.dataTransfer ?? {};
        if (filesFromDropEvent) {
            if (filesFromDropEvent.length > 1) {
                console.error("Only one file is permitted");
            } else {
                files = filesFromDropEvent;
            }
        }
        dropZoneRef.classList.remove("tw-border-cyan-400");
    }

    onDestroy(() => {
        mapEditorEntityUploadEventStoreUnsubscriber();
    });
</script>

{#if customEntityToUpload}
    <div class="tw-absolute tw-top-0 tw-left-0 tw-w-full tw-backdrop-blur-3xl tw-p-8 tw-h-full tw-overflow-auto">
        <EntityEditionUploadForm
            on:closeForm={initFileUpload}
            customEntity={customEntityToUpload}
            onConfirmUpload={processFileToUpload}
        />
    </div>
{:else}
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
                data-testid="uploadCustomAsset"
            />

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
        </div>
    </div>
{/if}

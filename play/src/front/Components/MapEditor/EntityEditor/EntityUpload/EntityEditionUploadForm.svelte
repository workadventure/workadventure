<script lang="ts">
    import { EntityPrefab } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import LL from "../../../../../i18n/i18n-svelte";
    import EntityImage from "../EntityItem/EntityImage.svelte";
    import EntityEditionCollisionGrid from "./EntityEditionCollisionGrid.svelte";

    export let customEntity: EntityPrefab;
    export let onConfirmUpload: (customEntityToUpload: EntityPrefab) => Promise<void>;

    let { name, tags, collisionGrid: customEntityCollisionGrid } = customEntity;
    let inputTags = tags.join(",");
    const dispatch = createEventDispatcher();
    let collisionGrid = customEntityCollisionGrid ?? [];
    let floatingObject = false;
    let imageHeight: number;

    function processCustomEntityUpload() {
        onConfirmUpload({
            ...customEntity,
            name,
            tags: convertTagsInputIntoTagArray(inputTags),
            collisionGrid: floatingObject ? undefined : collisionGrid,
        }).catch((e) => console.error(e));
    }

    function convertTagsInputIntoTagArray(tags: string) {
        return tags.trim().length === 0 ? [] : tags.split(",").map((tag) => tag.trim());
    }

    const COLLISION_GRID_SIZE = 32;
    function generateCollisionGridIfNotExists(imageRef: HTMLImageElement) {
        if (collisionGrid.length === 0) {
            imageHeight = imageRef.height;
            const nbColumn = Math.ceil(imageRef.naturalWidth / COLLISION_GRID_SIZE);
            const nbRow = Math.ceil(imageRef.naturalHeight / COLLISION_GRID_SIZE);
            collisionGrid = Array(nbRow)
                .fill(0)
                .map(() => Array(nbColumn).fill(0));
        }
    }

    function updateCollisionGrid(rowIndex: number, columnIndex: number) {
        collisionGrid[rowIndex][columnIndex] = collisionGrid[rowIndex][columnIndex] === 0 ? 1 : 0;
    }
</script>

<div class="tw-flex tw-flex-col tw-flex-1 tw-gap-2">
    <div class="tw-self-center">
        {#if !floatingObject}
            <EntityEditionCollisionGrid {collisionGrid} {updateCollisionGrid} collisionGridHeight={imageHeight} />
        {/if}
        <EntityImage
            classNames="tw-w-32"
            on:onImageLoad={(event) => generateCollisionGridIfNotExists(event.detail)}
            imageSource={customEntity.imagePath}
            imageAlt={customEntity.name}
        />
    </div>
    <div>
        <label for="id"><b>{$LL.mapEditor.entityEditor.customEntityEditorForm.imageName()}</b></label>
        <input
            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
            bind:value={name}
            id="name"
        />
    </div>
    <div>
        <label for="tags"><b>{$LL.mapEditor.entityEditor.customEntityEditorForm.tags()}</b></label>
        <input
            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
            bind:value={inputTags}
            id="tags"
        />
    </div>
    <div>
        <label for="type"><b>{$LL.mapEditor.entityEditor.customEntityEditorForm.objectType()}</b></label>
        <input
            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
            id="type"
        />
    </div>
    <div class="tw-flex tw-gap-2 tw-mt-2 hover:tw-cursor-pointer">
        <input
            type="checkbox"
            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white"
            id="floatingObject"
            bind:checked={floatingObject}
        />
        <label class="tw-mt-[-4px]" for="floatingObject"
            ><b>{$LL.mapEditor.entityEditor.customEntityEditorForm.floatingObject()}</b>
            <p>
                {$LL.mapEditor.entityEditor.customEntityEditorForm.floatingObjectDescription()}
            </p></label
        >
    </div>
    <div class="tw-flex tw-flex-row  tw-gap-2 tw-flex-wrap tw-justify-end">
        <button class="tw-rounded-xl tw-border-white tw-border tw-border-solid" on:click={() => dispatch("closeForm")}
            >{$LL.mapEditor.entityEditor.buttons.cancel()}</button
        >
        <button class="tw-bg-blue-500 tw-rounded-xl" on:click={processCustomEntityUpload}>{$LL.mapEditor.entityEditor.buttons.upload()}</button>
    </div>
</div>

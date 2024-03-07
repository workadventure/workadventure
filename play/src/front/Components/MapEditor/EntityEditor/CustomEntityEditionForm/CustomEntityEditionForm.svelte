<script lang="ts">
    import { EntityPrefab } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import LL from "../../../../../i18n/i18n-svelte";
    import EntityImage from "../EntityItem/EntityImage.svelte";
    import EntityEditionCollisionGrid from "./EntityEditionCollisionGrid.svelte";

    export let customEntity: EntityPrefab;
    export let isUploadForm = false;

    let { name, tags, collisionGrid: customEntityCollisionGrid, depthOffset: depthOffsetCustomEntity } = customEntity;
    let inputTags = tags.join(",");

    let collisionGrid = customEntityCollisionGrid ?? [];
    let floatingObject = isUploadForm ? false : customEntityCollisionGrid === undefined;
    let depthOffset: number = depthOffsetCustomEntity ? depthOffsetCustomEntity * -1 : 0;
    let entityImageRef: HTMLImageElement;
    let displayDepthCustomSelector = false;

    const dispatch = createEventDispatcher<{
        applyEntityModifications: EntityPrefab;
        closeForm: undefined;
        removeEntity: { entityId: string };
    }>();

    enum depthOptions {
        GROUND_LEVEL = "GroundLevel",
        STANDING = "Standing",
        CUSTOM = "Custom",
    }
    let selectedDepthOption: depthOptions = depthOffset === 0 ? depthOptions.STANDING : depthOptions.CUSTOM;

    function getModifiedCustomEntity(): EntityPrefab {
        return {
            ...customEntity,
            name: name,
            tags: convertTagsInputIntoTagArray(inputTags),
            collisionGrid: floatingObject ? undefined : collisionGrid,
            depthOffset: depthOffset !== 0 ? -depthOffset : 0,
        };
    }

    function convertTagsInputIntoTagArray(tags: string) {
        return tags.trim().length === 0 ? [] : tags.split(",").map((tag) => tag.trim());
    }

    const COLLISION_GRID_SIZE = 32;
    function generateCollisionGridIfNotExists(imageRef: HTMLImageElement) {
        entityImageRef = imageRef;
        if (collisionGrid.length === 0) {
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

    $: {
        updateDepthOffset(selectedDepthOption);
    }

    function updateDepthOffset(depthOption: depthOptions) {
        if (depthOption === depthOptions.STANDING) {
            depthOffset = 0;
        }
        if (depthOption === depthOptions.CUSTOM) {
            displayDepthCustomSelector = true;
        }
        if (depthOption === depthOptions.GROUND_LEVEL) {
            depthOffset = entityImageRef?.naturalHeight;
        }
    }

    function getTranslationForDepthOption(depthOption: depthOptions) {
        if (depthOption === depthOptions.STANDING) {
            return $LL.mapEditor.entityEditor.customEntityEditorForm.standing();
        }
        if (depthOption === depthOptions.CUSTOM) {
            return $LL.mapEditor.entityEditor.customEntityEditorForm.custom();
        }
        return $LL.mapEditor.entityEditor.customEntityEditorForm.groundLevel();
    }
</script>

<div class="tw-flex tw-flex-col tw-flex-1 tw-gap-2">
    <div class="tw-self-center tw-relative tw-flex tw-items-center">
        {#if !floatingObject}
            <EntityEditionCollisionGrid
                {collisionGrid}
                {updateCollisionGrid}
                collisionGridHeight={entityImageRef?.height}
            />
        {/if}
        <EntityImage
            classNames="tw-w-32 tw-max-h-32 tw-object-contain"
            on:onImageLoad={(event) => generateCollisionGridIfNotExists(event.detail)}
            imageSource={customEntity.imagePath}
            imageAlt={customEntity.name}
        />
        {#if displayDepthCustomSelector}
            <div class="tw-rotate-[270deg]" style="width: 30px;margin-top: {entityImageRef?.height - 30}px">
                <input
                    class="!tw-cursor-grab active:!tw-cursor-grabbing slider"
                    style="width: {entityImageRef?.height}px"
                    bind:value={depthOffset}
                    type="range"
                    max={entityImageRef?.naturalHeight}
                />
            </div>
        {/if}
    </div>
    <div>
        <label for="id"><b>{$LL.mapEditor.entityEditor.customEntityEditorForm.imageName()}</b></label>
        <input
            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
            bind:value={name}
            id="name"
            data-testid="name"
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
        <label for="type"><b>{$LL.mapEditor.entityEditor.customEntityEditorForm.depth()}</b></label>
        <select
            bind:value={selectedDepthOption}
            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
        >
            {#each Object.values(depthOptions) as depthOption (depthOption)}
                <option value={depthOption}>{getTranslationForDepthOption(depthOption)}</option>
            {/each}
        </select>
    </div>
    {#if isUploadForm}
        <div class="tw-flex tw-gap-2 tw-mt-2 hover:tw-cursor-pointer">
            <input
                type="checkbox"
                class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white"
                id="floatingObject"
                data-testid="floatingObject"
                bind:checked={floatingObject}
            />
            <label class="tw-mt-[-4px]" for="floatingObject"
                ><b>{$LL.mapEditor.entityEditor.customEntityEditorForm.floatingObject()}</b>
                <br />
                {$LL.mapEditor.entityEditor.customEntityEditorForm.floatingObjectDescription()}
            </label>
        </div>
    {/if}
    <div class="tw-flex tw-flex-row  tw-gap-2 tw-flex-wrap tw-justify-end tw-text-sm">
        {#if !isUploadForm}
            <button
                class="tw-bg-red-500 tw-rounded"
                data-testid="removeEntity"
                on:click={() => dispatch("removeEntity", { entityId: customEntity.id })}
                >{$LL.mapEditor.entityEditor.buttons.delete()}</button
            >
        {/if}
        <button class="tw-rounded tw-border-white tw-border tw-border-solid" on:click={() => dispatch("closeForm")}
            >{$LL.mapEditor.entityEditor.buttons.cancel()}</button
        >
        <button
            class="tw-bg-blue-500 tw-rounded"
            data-testid="applyEntityModifications"
            on:click={() => dispatch("applyEntityModifications", getModifiedCustomEntity())}
            >{isUploadForm
                ? $LL.mapEditor.entityEditor.buttons.upload()
                : $LL.mapEditor.entityEditor.buttons.save()}</button
        >
    </div>
</div>

<style lang="scss">
    .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 5px;
        height: 40px;
        margin-top: -32px;
    }

    .slider::-moz-range-thumb {
        width: 5px;
        height: 40px;
        margin-top: -32px;
    }
</style>

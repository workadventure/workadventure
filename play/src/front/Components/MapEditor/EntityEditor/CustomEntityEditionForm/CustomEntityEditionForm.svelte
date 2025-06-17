<script lang="ts">
    import { EntityPrefab } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import LL from "../../../../../i18n/i18n-svelte";
    import EntityImage from "../EntityItem/EntityImage.svelte";
    import { InputTagOption } from "../../../Input/InputTagOption";
    import InputTags from "../../../Input/InputTags.svelte";
    import Select from "../../../Input/Select.svelte";
    import Input from "../../../Input/Input.svelte";
    import InputCheckbox from "../../../Input/InputCheckbox.svelte";
    import LogoCollisionGrid from "./LogoCollisionGrid.svg";
    import EntityEditionCollisionGrid from "./EntityEditionCollisionGrid.svelte";

    export let customEntity: EntityPrefab;
    export let isUploadForm = false;

    let { name, tags, collisionGrid: customEntityCollisionGrid, depthOffset: depthOffsetCustomEntity } = customEntity;
    let inputTagOptions: InputTagOption[] | undefined = tags.map((tag) => ({ value: tag, label: tag }));

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
            tags: inputTagOptions !== undefined ? inputTagOptions.map((tagOption) => tagOption.value) : [],
            collisionGrid: floatingObject ? undefined : collisionGrid,
            depthOffset: depthOffset !== 0 ? -depthOffset : 0,
        };
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

    $: if (selectedDepthOption) {
        updateDepthOffset(selectedDepthOption);
    }
</script>

<div class="flex flex-col flex-1 gap-2">
    <div class="self-center relative flex items-center">
        {#if !floatingObject}
            <EntityEditionCollisionGrid
                {collisionGrid}
                {updateCollisionGrid}
                collisionGridHeight={entityImageRef?.height}
            />
        {/if}
        <EntityImage
            classNames="w-32 max-h-32 object-contain"
            on:onImageLoad={(event) => generateCollisionGridIfNotExists(event.detail)}
            imageSource={customEntity.imagePath}
            imageAlt={customEntity.name}
        />
        {#if displayDepthCustomSelector}
            <div>
                <p class="m-0 p-0 text-xs">{$LL.mapEditor.entityEditor.customEntityEditorForm.wokaAbove()}</p>
                <div class="rotate-[270deg]" style="width: 30px;margin-top: {entityImageRef?.height - 30}px">
                    <input
                        class="!cursor-grab active:!cursor-grabbing slider"
                        style="width: {entityImageRef?.height}px"
                        bind:value={depthOffset}
                        type="range"
                        max={entityImageRef?.naturalHeight}
                    />
                </div>
                <p class="m-0 p-0 text-xs">{$LL.mapEditor.entityEditor.customEntityEditorForm.wokaBelow()}</p>
            </div>
        {/if}
    </div>
    {#if !floatingObject}
        <div>
            <img src={LogoCollisionGrid} alt="Logo collision grid" width="28px" />
            <p class="text-xs m-0 p-0">{$LL.mapEditor.entityEditor.customEntityEditorForm.collision()}</p>
        </div>
    {/if}
    <div>
        <label class="mb-2 block" for="id"><b>{$LL.mapEditor.entityEditor.customEntityEditorForm.imageName()}</b></label
        >
        <Input
            class="px-2 py-2.5 text-[16px] rounded-md bg-contrast border-solid border border-contrast-400 text-white min-w-full"
            bind:value={name}
            id="name"
            data-testid="name"
        />
    </div>
    <div>
        <label class="mb-2 block" for="tags"><b>{$LL.mapEditor.entityEditor.customEntityEditorForm.tags()}</b></label>
        <InputTags
            bind:value={inputTagOptions}
            placeholder={$LL.mapEditor.entityEditor.customEntityEditorForm.writeTag()}
        />
    </div>
    <div>
        <Select
            id="type"
            label={$LL.mapEditor.entityEditor.customEntityEditorForm.depth()}
            bind:value={selectedDepthOption}
        >
            {#each Object.values(depthOptions) as depthOption (depthOption)}
                <option value={depthOption}>{getTranslationForDepthOption(depthOption)}</option>
            {/each}
        </Select>
    </div>
    {#if isUploadForm}
        <div class="flex gap-2 mt-2 hover:cursor-pointer">
            <InputCheckbox id="floatingObject" dataTestId="floatingObject" bind:value={floatingObject} />
            <label class="my-[4px]" for="floatingObject"
                ><b class="-mb-2 block">{$LL.mapEditor.entityEditor.customEntityEditorForm.floatingObject()}</b>
                <br />
                {$LL.mapEditor.entityEditor.customEntityEditorForm.floatingObjectDescription()}
            </label>
        </div>
    {/if}
    <div class="flex gap-2 flex-wrap justify-center w-full text-sm">
        {#if !isUploadForm}
            <button
                class="btn-lg btn btn-danger w-full"
                data-testid="removeEntity"
                on:click={() => dispatch("removeEntity", { entityId: customEntity.id })}
                >{$LL.mapEditor.entityEditor.buttons.delete()}</button
            >
        {/if}

        <div class="flex gap-2 w-full mt-2">
            <button class="btn-lg btn btn-contrast w-full" on:click={() => dispatch("closeForm")}
                >{$LL.mapEditor.entityEditor.buttons.cancel()}</button
            >

            <button
                class="btn-lg btn btn-secondary w-full"
                data-testid="applyEntityModifications"
                on:click={() => dispatch("applyEntityModifications", getModifiedCustomEntity())}
                >{isUploadForm
                    ? $LL.mapEditor.entityEditor.buttons.upload()
                    : $LL.mapEditor.entityEditor.buttons.save()}</button
            >
        </div>
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

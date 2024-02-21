<script lang="ts">
    import { EntityPrefab } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import {
        mapEditorDeleteCustomEntityEventStore,
        mapEditorModifyCustomEntityEventStore
    } from "../../../../Stores/MapEditorStore";
    import LL from "../../../../../i18n/i18n-svelte";
    import EntityImage from "./EntityImage.svelte";

    export let customEntity: EntityPrefab;
    let { name, tags } = structuredClone(customEntity);
    let inputTags = tags.join(",");
    const dispatch = createEventDispatcher();

    function saveCustomEntityModifications() {
        mapEditorModifyCustomEntityEventStore.set({
            id: customEntity.id,
            name,
            tags: convertTagsInputIntoTagArray(inputTags),
        });
        dispatch("closeForm");
    }

    function convertTagsInputIntoTagArray(tags: string) {
        return tags.trim().length === 0 ? [] : tags.split(",").map((tag) => tag.trim());
    }

    function removeCustomEntity() {
        mapEditorDeleteCustomEntityEventStore.set({ id: customEntity.id });
        dispatch("onRemoveEntity");
    }


</script>

<div class="tw-flex tw-flex-col tw-flex-1 tw-gap-2 tw-relative">
    <div class="tw-self-center">
        <EntityImage
            classNames="tw-w-32 "
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
    <div class="tw-flex tw-flex-row  tw-gap-2 tw-flex-wrap tw-justify-end">
        <button class="tw-bg-red-500 tw-rounded-xl" on:click={removeCustomEntity}
            >{$LL.mapEditor.entityEditor.buttons.delete()}</button
        >
        <button class="tw-rounded-xl tw-border-white tw-border tw-border-solid" on:click={() => dispatch("closeForm")}
            >{$LL.mapEditor.entityEditor.buttons.cancel()}</button
        >
        <button class="tw-bg-blue-500 tw-rounded-xl" on:click={saveCustomEntityModifications}
            >{$LL.mapEditor.entityEditor.buttons.save()}</button
        >
    </div>
</div>

<script lang="ts">
    import { EntityPrefab } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import { mapEditorModifyCustomEntityEventStore } from "../../../../Stores/MapEditorStore";

    export let customEntity: EntityPrefab;
    let { name, tags } = structuredClone(customEntity);
    let inputTags = tags.join(",");
    const dispatch = createEventDispatcher();

    function saveCustomEntityModifications() {
        mapEditorModifyCustomEntityEventStore.set({
            id: customEntity.name,
            name,
            tags: inputTags.trim().length === 0 ? [] : inputTags.trim().split(","),
        });
        dispatch("closeForm");
    }
</script>

<div class="tw-flex tw-flex-col tw-flex-1 tw-gap-2">
    <div>
        <b>Image name</b>
        <input
            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
            bind:value={name}
        />
    </div>
    <div>
        <b>Tags</b>
        <input
            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
            bind:value={inputTags}
        />
    </div>
    <div>
        <b>Object type</b>
        <input
            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
        />
    </div>
    <div class="tw-flex tw-flex-row tw-self-end tw-gap-2">
        <button class="tw-rounded-xl tw-border-white tw-border tw-border-solid" on:click={() => dispatch("closeForm")}
            >Cancel</button
        >
        <button class="tw-bg-blue-500 tw-rounded-xl" on:click={saveCustomEntityModifications}>Save</button>
    </div>
</div>

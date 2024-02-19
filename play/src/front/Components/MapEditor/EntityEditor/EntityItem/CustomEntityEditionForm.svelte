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
            id: customEntity.id,
            name,
            tags: convertTagsInputIntoTagArray(inputTags),
        });
        dispatch("closeForm");
    }

    function convertTagsInputIntoTagArray(tags: string) {
        return tags.trim().length === 0 ? [] : tags.split(",").map((tag) => tag.trim());
    }
</script>

<div class="tw-flex tw-flex-col tw-flex-1 tw-gap-2">
    <div>
        <label for="id"><b>Image name</b></label>
        <input
            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
            bind:value={name}
            id="name"
        />
    </div>
    <div>
        <label for="tags"><b>Tags</b></label>
        <input
            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
            bind:value={inputTags}
            id="tags"
        />
    </div>
    <div>
        <label for="type"><b>Object type</b></label>
        <input
            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
            id="type"
        />
    </div>
    <div class="tw-flex tw-flex-row tw-self-end tw-gap-2">
        <button class="tw-rounded-xl tw-border-white tw-border tw-border-solid" on:click={() => dispatch("closeForm")}
            >Cancel</button
        >
        <button class="tw-bg-blue-500 tw-rounded-xl" on:click={saveCustomEntityModifications}>Save</button>
    </div>
</div>

<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { LockableAreaPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconLockCancel } from "../../Icons";
    import type { InputTagOption } from "../../Input/InputTagOption";
    import InputRoomTags from "../../Input/InputRoomTags.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: LockableAreaPropertyData;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();

    // Initialize allowedTagsValue from property.allowedTags
    let allowedTagsValue: InputTagOption[] | undefined =
        property.allowedTags && property.allowedTags.length > 0
            ? property.allowedTags.map((tag) => ({ value: tag, label: tag }))
            : undefined;

    // Update allowedTagsValue when property.allowedTags changes (from outside)
    $: {
        if (property.allowedTags && property.allowedTags.length > 0) {
            const newValue = property.allowedTags.map((tag) => ({ value: tag, label: tag }));
            // Only update if the values are different to avoid infinite loops
            const currentValueStr = JSON.stringify(allowedTagsValue);
            const newValueStr = JSON.stringify(newValue);
            if (currentValueStr !== newValueStr) {
                allowedTagsValue = newValue;
            }
        } else if (allowedTagsValue !== undefined) {
            allowedTagsValue = undefined;
        }
    }

    function onTagsChange(tags: InputTagOption[] | undefined) {
        // Update property.allowedTags from the tags parameter
        if (tags && tags.length > 0) {
            property.allowedTags = tags.map((tag) => tag.value);
        } else {
            // Set to empty array instead of undefined to ensure it's saved
            property.allowedTags = [];
        }
        dispatch("change");
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="flex justify-center items-center">
        <IconLockCancel font-size="18" class="mr-2" />
        {$LL.mapEditor.properties.lockableAreaPropertyData.label()}
    </span>
    <span slot="content">
        <div class="tags-input">
            <InputRoomTags
                bind:value={allowedTagsValue}
                on:change={(e) => onTagsChange(e.detail)}
                label={$LL.mapEditor.properties.lockableAreaPropertyData.allowedTagsLabel()}
                info={$LL.mapEditor.properties.lockableAreaPropertyData.allowedTagsInfo()}
            />
        </div>
    </span>
</PropertyEditorBase>

<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { LockableAreaPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconLockCancel } from "../../Icons";
    import type { InputTagOption } from "../../Input/InputTagOption";
    import { toTags } from "../../Input/InputTagOption";
    import InputRoomTags from "../../Input/InputRoomTags.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: LockableAreaPropertyData;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();

    // Local state for tags, initialized once from property (same pattern as PersonalAreaPropertyEditor).
    // No reactive sync from property to avoid overwriting user removals when parent re-renders with stale data.
    let _allowedTags: InputTagOption[] | undefined =
        property.allowedTags && property.allowedTags.length > 0
            ? property.allowedTags.map((tag) => ({ value: tag, label: tag }))
            : undefined;

    function handleTagChange(tags: InputTagOption[] | undefined) {
        if (tags && tags.length > 0) {
            property.allowedTags = toTags(tags);
        } else {
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
                bind:value={_allowedTags}
                handleChange={() => handleTagChange(_allowedTags)}
                label={$LL.mapEditor.properties.lockableAreaPropertyData.allowedTagsLabel()}
                info={$LL.mapEditor.properties.lockableAreaPropertyData.allowedTagsInfo()}
            />
        </div>
    </span>
</PropertyEditorBase>

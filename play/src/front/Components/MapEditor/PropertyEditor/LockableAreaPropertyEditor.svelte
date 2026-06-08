<script lang="ts">
    import type { LockableAreaPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconLock } from "../../Icons";
    import type { InputTagOption } from "../../Input/InputTagOption";
    import { toTags } from "../../Input/InputTagOption";
    import InputRoomTags from "../../Input/InputRoomTags.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    interface Props {
        property: LockableAreaPropertyData;
        onchange?: () => void;
        onclose?: () => void;
    }

    let { property = $bindable(), onchange, onclose }: Props = $props();

    // Local state for tags, initialized once from property (same pattern as PersonalAreaPropertyEditor).
    // No reactive sync from property to avoid overwriting user removals when parent re-renders with stale data.
    let _allowedTags: InputTagOption[] | undefined = $state(
        property.allowedTags && property.allowedTags.length > 0
            ? property.allowedTags.map((tag) => ({ value: tag, label: tag }))
            : undefined,
    );

    function handleTagChange(tags: InputTagOption[] | undefined) {
        if (tags && tags.length > 0) {
            property.allowedTags = toTags(tags);
        } else {
            property.allowedTags = [];
        }
        onchange?.();
    }
</script>

<PropertyEditorBase
    onclose={() => {
        onclose?.();
    }}
>
    {#snippet header()}
        <span class="flex justify-center items-center">
            <IconLock font-size="18" class="mr-2" />
            {$LL.mapEditor.properties.lockableAreaPropertyData.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            <div class="tags-input">
                <InputRoomTags
                    bind:value={_allowedTags}
                    onchange={() => handleTagChange(_allowedTags)}
                    label={$LL.mapEditor.properties.lockableAreaPropertyData.allowedTagsLabel()}
                    info={$LL.mapEditor.properties.lockableAreaPropertyData.allowedTagsInfo()}
                />
            </div>
        </span>
    {/snippet}
</PropertyEditorBase>

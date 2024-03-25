<script lang="ts">
    import { InfoIcon } from "svelte-feather-icons";
    import { RestrictedRightsPropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher, onDestroy } from "svelte";
    import InputTags from "../../Input/InputTags.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { mapEditorSelectedAreaPreviewStore } from "../../../Stores/MapEditorStore";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    type Option = {
        value: string;
        label: string;
        created: undefined | boolean;
    };
    let writeTags: Option[] | undefined = [];
    let readTags: Option[] | undefined = [];
    let _tag: Option[] = [];
    let restrictedRightsProperty: RestrictedRightsPropertyData | undefined = undefined;

    const mapEditorSelectedAreaPreviewUnsubscriber = mapEditorSelectedAreaPreviewStore.subscribe(
        (currentSelectedArea) => {
            const rightsProperty = currentSelectedArea
                ?.getProperties()
                .find((property) => property.type === "restrictedRightsPropertyData");
            if (rightsProperty !== undefined) {
                restrictedRightsProperty = RestrictedRightsPropertyData.parse(rightsProperty);
                writeTags = restrictedRightsProperty.writeTags.map((tag) => {
                    return { value: tag, label: tag, created: false };
                });
                readTags = restrictedRightsProperty.readTags.map((tag) => {
                    return { value: tag, label: tag, created: false };
                });
            }
        }
    );

    function onChangeWriteReadTags() {
        if (restrictedRightsProperty !== undefined) {
            restrictedRightsProperty.readTags = readTags?.map((tag) => tag.value) ?? [];
            restrictedRightsProperty.writeTags = writeTags?.map((tag) => tag.value) ?? [];
            $mapEditorSelectedAreaPreviewStore?.updateProperty(restrictedRightsProperty);
        }
    }

    const dispatch = createEventDispatcher();

    onDestroy(() => {
        mapEditorSelectedAreaPreviewUnsubscriber();
    });
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        {$LL.mapEditor.properties.restrictedRightsProperties.label()}
    </span>
    <span slot="content">
        <p class="help-text">
            <InfoIcon size="18" />
            {$LL.mapEditor.properties.restrictedRightsProperties.rightWriteDescription()}
        </p>
        <InputTags
            label={$LL.mapEditor.properties.restrictedRightsProperties.rightWriteTitle()}
            options={_tag}
            bind:value={writeTags}
            handleChange={onChangeWriteReadTags}
            testId="writeTags"
        />
        <p class="help-text">
            <InfoIcon size="18" />
            {$LL.mapEditor.properties.restrictedRightsProperties.rightReadDescription()}
        </p>
        <InputTags
            label={$LL.mapEditor.properties.restrictedRightsProperties.rightReadTitle()}
            options={_tag}
            bind:value={readTags}
            handleChange={onChangeWriteReadTags}
            testId="readTags"
        />
        {#if writeTags !== undefined && writeTags.length > 0}
            <div class="tw-flex tw-flex-wrap tw-gap-1">
                {#each writeTags as tag, index (`${index}-${tag.value}`)}
                    <span class="tw-py-1 tw-px-2 tw-bg-gray-400 tw-text-black tw-rounded-lg">{tag.label}</span>
                {/each}
            </div>
        {/if}
    </span>
</PropertyEditorBase>

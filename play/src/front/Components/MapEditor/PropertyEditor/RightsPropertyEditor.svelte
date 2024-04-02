<script lang="ts">
    import { InfoIcon } from "svelte-feather-icons";
    import { RestrictedRightsPropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import InputTags from "../../Input/InputTags.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { InputTagOption, toTags } from "../../Input/InputTagOption";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let restrictedRightsPropertyData: RestrictedRightsPropertyData;

    let writeTags: InputTagOption[] | undefined = restrictedRightsPropertyData.writeTags.map((writeTag) => ({
        value: writeTag,
        label: writeTag,
        created: false,
    }));
    let readTags: InputTagOption[] | undefined = restrictedRightsPropertyData.readTags.map((readTag) => ({
        value: readTag,
        label: readTag,
        created: false,
    }));
    let _tag: InputTagOption[] = [];

    function onChangeWriteReadTags() {
        restrictedRightsPropertyData.readTags = readTags ? toTags(readTags) : [];
        restrictedRightsPropertyData.writeTags = writeTags ? toTags(writeTags) : [];
        dispatch("change");
    }

    const dispatch = createEventDispatcher();
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

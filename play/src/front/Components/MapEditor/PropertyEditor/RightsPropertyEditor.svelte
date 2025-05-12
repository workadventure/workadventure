<script lang="ts">
    import { RestrictedRightsPropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import InputRoomTags from "../../Input/InputRoomTags.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { InputTagOption, toTags } from "../../Input/InputTagOption";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import { IconInfoCircle } from "@wa-icons";

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

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="flex justify-center items-center">
        {$LL.mapEditor.properties.restrictedRightsProperties.label()}
    </span>
    <span slot="content">
        <InputRoomTags
            label={$LL.mapEditor.properties.restrictedRightsProperties.rightWriteTitle()}
            options={_tag}
            bind:value={writeTags}
            handleChange={onChangeWriteReadTags}
            testId="writeTags"
        >
            <span slot="info">
                <IconInfoCircle font-size="15" />
                {$LL.mapEditor.properties.restrictedRightsProperties.rightWriteDescription()}
            </span>
        </InputRoomTags>

        <InputRoomTags
            label={$LL.mapEditor.properties.restrictedRightsProperties.rightReadTitle()}
            options={_tag}
            bind:value={readTags}
            handleChange={onChangeWriteReadTags}
            testId="readTags"
        >
            <span slot="info">
                <IconInfoCircle font-size="15" />
                {$LL.mapEditor.properties.restrictedRightsProperties.rightReadDescription()}
            </span></InputRoomTags
        >

        {#if writeTags !== undefined && writeTags.length > 0}
            <div class="flex flex-wrap gap-1">
                {#each writeTags as tag, index (`${index}-${tag.value}`)}
                    <span class="py-1 px-2 bg-gray-400 text-black rounded-lg">{tag.label}</span>
                {/each}
            </div>
        {/if}
    </span>
</PropertyEditorBase>

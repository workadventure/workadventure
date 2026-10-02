<script lang="ts">
    import type { RestrictedRightsPropertyData } from "@workadventure/map-editor";
    import InputRoomTags from "../../Input/InputRoomTags.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import type { InputTagOption } from "../../Input/InputTagOption";
    import { toTags } from "../../Input/InputTagOption";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import { IconInfoCircle, IconShieldLock } from "@wa-icons";

    interface Props {
        property: RestrictedRightsPropertyData;
        onchange?: () => void;
        onclose?: () => void;
    }

    let { property = $bindable(), onchange, onclose }: Props = $props();

    let writeTags: InputTagOption[] | undefined = $state(
        (() =>
            property.writeTags.map((writeTag) => ({
                value: writeTag,
                label: writeTag,
                created: false,
            })))(),
    );
    let readTags: InputTagOption[] | undefined = $state(
        (() =>
            property.readTags.map((readTag) => ({
                value: readTag,
                label: readTag,
                created: false,
            })))(),
    );
    let _tag: InputTagOption[] = [];

    function onChangeWriteReadTags() {
        property.readTags = readTags ? toTags(readTags) : [];
        property.writeTags = writeTags ? toTags(writeTags) : [];
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
            <IconShieldLock class="w-6 mr-1" />
            {$LL.mapEditor.properties.restrictedRightsPropertyData.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            <InputRoomTags
                label={$LL.mapEditor.properties.restrictedRightsPropertyData.rightWriteTitle()}
                options={_tag}
                bind:value={writeTags}
                onchange={onChangeWriteReadTags}
                testId="writeTags"
            >
                {#snippet info()}
                    <span>
                        <IconInfoCircle font-size="15" />
                        {$LL.mapEditor.properties.restrictedRightsPropertyData.rightWriteDescription()}
                    </span>
                {/snippet}
            </InputRoomTags>

            <InputRoomTags
                label={$LL.mapEditor.properties.restrictedRightsPropertyData.rightReadTitle()}
                options={_tag}
                bind:value={readTags}
                onchange={onChangeWriteReadTags}
                testId="readTags"
            >
                {#snippet info()}
                    <span>
                        <IconInfoCircle font-size="15" />
                        {$LL.mapEditor.properties.restrictedRightsPropertyData.rightReadDescription()}
                    </span>
                {/snippet}
            </InputRoomTags>

            {#if writeTags !== undefined && writeTags.length > 0}
                <div class="flex flex-wrap gap-1 py-2 px-1">
                    {#each writeTags as tag, index (`${index}-${tag.value}`)}
                        <span class="py-1 px-2 bg-gray-400 text-black rounded-lg">{tag.label}</span>
                    {/each}
                </div>
            {/if}
        </span>
    {/snippet}
</PropertyEditorBase>

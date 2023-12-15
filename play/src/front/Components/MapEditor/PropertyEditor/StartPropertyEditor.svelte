<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { StartPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    const dispatch = createEventDispatcher();
    export let property: StartPropertyData;

    function onValueChange() {
        dispatch("change");
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        <img
            class="tw-w-6 tw-mr-1"
            src="resources/icons/icon_start.png"
            alt={$LL.mapEditor.properties.startProperties.description()}
        />
        {$LL.mapEditor.properties.startProperties.label()}
    </span>

    <span slot="content">
        <div>
            <label for="startTypeSelector">{$LL.mapEditor.properties.startProperties.type()}</label>
            <select
                id="startTypeSelector"
                class="tw-w-full"
                bind:value={property.isDefault}
                on:change={() => {
                    onValueChange();
                }}
            >
                <option value={true}>{$LL.mapEditor.properties.startProperties.defaultMenuItem()}</option>
                <option value={false}>{$LL.mapEditor.properties.startProperties.hashMenuItem()}</option>
            </select>
        </div>
    </span>
</PropertyEditorBase>

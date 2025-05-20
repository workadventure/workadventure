<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { StartPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Select from "../../Input/Select.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();
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
    <span slot="header" class="flex justify-center items-center">
        <img
            class="w-6 me-2"
            src="resources/icons/icon_start.png"
            alt={$LL.mapEditor.properties.startProperties.description()}
        />
        {$LL.mapEditor.properties.startProperties.label()}
    </span>

    <span slot="content">
        <div>
            <Select
                id="startTypeSelector"
                label={$LL.mapEditor.properties.startProperties.type()}
                bind:value={property.isDefault}
                onChange={() => {
                    onValueChange();
                }}
            >
                <option value={true}>{$LL.mapEditor.properties.startProperties.defaultMenuItem()}</option>
                <option value={false}>{$LL.mapEditor.properties.startProperties.hashMenuItem()}</option>
            </Select>
        </div>
    </span>
</PropertyEditorBase>

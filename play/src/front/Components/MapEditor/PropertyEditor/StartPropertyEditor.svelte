<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { StartPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Select from "../../Input/Select.svelte";
    import { IconDoorIn } from "../../Icons";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();
    export let property: StartPropertyData;
    export let startAreaName: string;
    export let updateStartAreaNameCallback: (name: string) => void;

    function onValueChange() {
        // Replace all special characters or spaces with an empty string
        if (property.isDefault === false)
            updateStartAreaNameCallback(
                startAreaName
                    .trim()
                    .replace(/[^a-zA-Z0-9 !@#$%^&*]/g, "")
                    .replaceAll(" ", "-")
                    .toLowerCase()
            );
        dispatch("change");
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="flex justify-center items-center">
        <IconDoorIn font-size="18" class="mr-2" />
        {$LL.mapEditor.properties.start.label()}
    </span>

    <span slot="content">
        <div>
            <p class="text-sm text-white/50 px-2 m-0">{$LL.mapEditor.properties.start.infoAreaName()}</p>

            <Select
                id="startTypeSelector"
                label={$LL.mapEditor.properties.start.type()}
                bind:value={property.isDefault}
                onChange={() => {
                    onValueChange();
                }}
            >
                <option value={true}>{$LL.mapEditor.properties.start.defaultMenuItem()}</option>
                <option value={false}>{$LL.mapEditor.properties.start.hashMenuItem()}</option>
            </Select>
        </div>
    </span>
</PropertyEditorBase>

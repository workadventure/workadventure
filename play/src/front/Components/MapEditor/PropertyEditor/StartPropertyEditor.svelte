<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { StartPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: StartPropertyData;

    const dispatch = createEventDispatcher();

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
        <div class="value-input">
            <label for="name">{$LL.mapEditor.properties.startProperties.nameLabel()}</label>
            <input
                id="name"
                type="text"
                placeholder={$LL.mapEditor.properties.startProperties.namePlaceholder()}
                bind:value={property.name}
                on:change={onValueChange}
            />
        </div>
    </span>
</PropertyEditorBase>

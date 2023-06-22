<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { StartPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    export let property: StartPropertyData;
    const dispatch = createEventDispatcher();
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
</PropertyEditorBase>

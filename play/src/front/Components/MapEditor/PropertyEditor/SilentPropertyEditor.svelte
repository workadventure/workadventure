<script lang="ts">
    import { SilentPropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: SilentPropertyData;

    const dispatch = createEventDispatcher();
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header">
        {$LL.mapEditor.properties.silentProperty.label()}
    </span>
</PropertyEditorBase>

<style lang="scss">
</style>

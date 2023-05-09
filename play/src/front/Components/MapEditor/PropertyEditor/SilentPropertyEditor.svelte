<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

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

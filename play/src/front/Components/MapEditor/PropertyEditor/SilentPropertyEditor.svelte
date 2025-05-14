<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

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
        <img
            class="w-6 me-2"
            src="resources/icons/icon_silent.png"
            alt={$LL.mapEditor.properties.silentProperty.description()}
        />
        {$LL.mapEditor.properties.silentProperty.label()}
    </span>
</PropertyEditorBase>

<style lang="scss">
</style>

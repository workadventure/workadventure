<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconMicrophoneOff } from "../../Icons";
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
        <IconMicrophoneOff font-size="18" class="mr-2" />
        {$LL.mapEditor.properties.silent.label()}
    </span>
</PropertyEditorBase>

<style lang="scss">
</style>

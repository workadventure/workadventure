<script lang="ts">
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconMicrophoneOff } from "../../Icons";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    interface Props {
        onclose?: () => void;
    }

    let { onclose }: Props = $props();
</script>

<PropertyEditorBase
    onclose={() => {
        onclose?.();
    }}
>
    {#snippet header()}
        <span class="flex justify-center items-center">
            <IconMicrophoneOff font-size="18" class="mr-2" />
            {$LL.mapEditor.properties.silent.label()}
        </span>
    {/snippet}
</PropertyEditorBase>

<style lang="scss">
</style>

<script lang="ts">
    import { mapEditorAreaModeStore, mapEditorSelectedAreaPreviewStore } from "../../../Stores/MapEditorStore";
    import AreaPropertiesEditor from "./AreaPropertiesEditor.svelte";
    import AreaEditorInstructions from "./AreaEditorInstructions.svelte";
</script>

{#if $mapEditorAreaModeStore === "ADD"}
    <AreaEditorInstructions />
{/if}
{#if $mapEditorAreaModeStore === "EDIT"}
    {#if $mapEditorSelectedAreaPreviewStore !== undefined}
        <AreaPropertiesEditor />
    {/if}
{/if}

<style lang="scss">
</style>

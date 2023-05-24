<script lang="ts">
    import { mapEditorAreaModeStore, mapEditorSelectedAreaPreviewStore } from "../../Stores/MapEditorStore";
    import AreaPropertiesEditor from "./AreaPropertiesEditor.svelte";
</script>

{#if $mapEditorAreaModeStore === "ADD"}
    <!-- <AreaPropertiesEditor /> -->
{/if}
{#if $mapEditorAreaModeStore === "EDIT"}
    {#if $mapEditorSelectedAreaPreviewStore !== undefined}
        <AreaPropertiesEditor />
    {/if}
{/if}

<style lang="scss">
</style>

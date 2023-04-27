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
    .area-basic-data {
        display: flex;
        align-items: center;

        label {
            min-width: fit-content;
            margin-right: 0.5em;
        }
        input {
            flex-grow: 1;
            min-width: 0;
        }
        * {
            margin-bottom: 0;
        }
    }
</style>

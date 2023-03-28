<script lang="ts">
    import { mapEditorAreaModeStore } from "../../Stores/MapEditorStore";
    import AreaPropertiesEditor from "./AreaPropertiesEditor.svelte";
</script>

{#if $mapEditorAreaModeStore === "ADD"}
    <AreaPropertiesEditor />
{/if}
{#if $mapEditorAreaModeStore === "EDIT"}
    <AreaPropertiesEditor />
{/if}

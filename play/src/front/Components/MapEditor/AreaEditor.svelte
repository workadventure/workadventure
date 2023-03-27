<script lang="ts">
    import { mapEditorAreaModeStore } from "../../Stores/MapEditorStore";
    import AreaPropertyEditor from "./AreaPropertyEditor.svelte";
</script>

{#if $mapEditorAreaModeStore === "ADD"}
    add Area mode
{/if}
{#if $mapEditorAreaModeStore === "EDIT"}
    <AreaPropertyEditor />
{/if}

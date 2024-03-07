<script lang="ts">
    import { mapEditorEntityModeStore } from "../../../Stores/MapEditorStore";
    import EntityEditorPicker from "./EntityEditorPicker.svelte";
    import EntityPropertiesEditor from "./EntityPropertiesEditor.svelte";
</script>

{#if $mapEditorEntityModeStore === "ADD"}
    <EntityEditorPicker />
{/if}
{#if $mapEditorEntityModeStore === "EDIT"}
    <EntityPropertiesEditor />
{/if}

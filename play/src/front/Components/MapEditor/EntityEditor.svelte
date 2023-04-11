<script lang="ts">
    import { mapEditorEntityModeStore } from "../../Stores/MapEditorStore";
    import ItemPicker from "./ItemPicker.svelte";
    import EntityPropertiesEditor from "./EntityPropertiesEditor.svelte";
</script>

{#if $mapEditorEntityModeStore === "ADD"}
    <ItemPicker />
{/if}
{#if $mapEditorEntityModeStore === "EDIT"}
    <EntityPropertiesEditor />
{/if}

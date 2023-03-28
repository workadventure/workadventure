<script lang="ts">
    import { mapEntityEditorModeStore } from "../../Stores/MapEditorStore";
    import ItemPicker from "./ItemPicker.svelte";
    import EntityPropertiesEditor from "./EntityPropertiesEditor.svelte";
</script>

{#if $mapEntityEditorModeStore === "ADD"}
    <ItemPicker />
{/if}
{#if $mapEntityEditorModeStore === "EDIT"}
    <EntityPropertiesEditor />
{/if}

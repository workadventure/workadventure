<script lang="ts">
    import { mapEntityEditorModeStore } from "../../Stores/MapEditorStore";
    import ItemPicker from "./ItemPicker.svelte";
    import EntityPropertyEditor from "./EntityPropertyEditor.svelte";
</script>

{#if $mapEntityEditorModeStore === "ADD"}
    <ItemPicker />
{/if}
{#if $mapEntityEditorModeStore === "EDIT"}
    <EntityPropertyEditor />
{/if}

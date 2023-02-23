<script lang="ts">
    import ItemPicker from "./ItemPicker.svelte";
    import MapEntityPropertyEditor from "./MapEntityPropertyEditor.svelte";
    import { MapEntityEditorMode, mapEntityEditorModeStore } from "../../Stores/MapEditorStore";
</script>

{#if $mapEntityEditorModeStore === MapEntityEditorMode.AddMode}
    <ItemPicker />
{/if}
{#if $mapEntityEditorModeStore === MapEntityEditorMode.EditMode}
    <MapEntityPropertyEditor />
{/if}

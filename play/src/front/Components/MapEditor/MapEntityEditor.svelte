<script lang="ts">
    import { MapEntityEditorMode, mapEntityEditorModeStore } from "../../Stores/MapEditorStore";
    import ItemPicker from "./ItemPicker.svelte";
    import MapEntityPropertyEditor from "./MapEntityPropertyEditor.svelte";
</script>

{#if $mapEntityEditorModeStore === MapEntityEditorMode.AddMode}
    <ItemPicker />
{/if}
{#if $mapEntityEditorModeStore === MapEntityEditorMode.EditMode}
    <MapEntityPropertyEditor />
{/if}

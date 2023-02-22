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

<style lang="scss">
    .mode-button-container {
        display: flex;
        flex-direction: row;
        button {
            flex: 1 1 0px;
            border: 1px solid grey;
        }
        button:hover {
            background-color: rgb(77 75 103);
        }
        button.active {
            background-color: rgb(77 75 103);
        }
    }
</style>

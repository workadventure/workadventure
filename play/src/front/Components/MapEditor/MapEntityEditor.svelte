<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import ItemPicker from "./ItemPicker.svelte";
    import MapEntityPropertyEditor from "./MapEntityPropertyEditor.svelte";
    import {
        mapEditorSelectedEntityStore,
        MapEntityEditorMode,
        mapEntityEditorModeStore,
    } from "../../Stores/MapEditorStore";

    function changeStore(editorMode: MapEntityEditorMode) {
        mapEntityEditorModeStore.set(editorMode);
        mapEditorSelectedEntityStore.set(undefined);
    }
</script>

<div class="mode-button-container">
    <button
        class={$mapEntityEditorModeStore === MapEntityEditorMode.AddMode ? "active" : ""}
        on:click={() => changeStore(MapEntityEditorMode.AddMode)}>{$LL.mapEditor.entityEditor.addButton()}</button
    >
    <button
        class={$mapEntityEditorModeStore === MapEntityEditorMode.EditMode ? "active" : ""}
        on:click={() => changeStore(MapEntityEditorMode.EditMode)}>{$LL.mapEditor.entityEditor.editButton()}</button
    >
    <button
        class={$mapEntityEditorModeStore === MapEntityEditorMode.RemoveMode ? "active" : ""}
        on:click={() => changeStore(MapEntityEditorMode.RemoveMode)}>{$LL.mapEditor.entityEditor.deleteButton()}</button
    >
</div>
{#if $mapEntityEditorModeStore === MapEntityEditorMode.AddMode}
    <ItemPicker />
{/if}
{#if $mapEntityEditorModeStore === MapEntityEditorMode.EditMode}
    <MapEntityPropertyEditor />
{/if}
{#if $mapEntityEditorModeStore === MapEntityEditorMode.RemoveMode}
    {$LL.mapEditor.entityEditor.removeInstructions()}
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

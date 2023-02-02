<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import {
        AreasEditorMode,
        areasEditorModeStore,
        mapEditorSelectedAreaPreviewStore,
    } from "../../Stores/MapEditorStore";
    import AreaPropertyEditor from "./AreaPropertyEditor.svelte";

    function changeStore(editorMode: AreasEditorMode) {
        areasEditorModeStore.set(editorMode);
        mapEditorSelectedAreaPreviewStore.set(undefined);
    }
</script>

<!-- TODO: CHANGE TRANSLATIONS KEYS -->
<div class="mode-button-container">
    <button
        class={$areasEditorModeStore === AreasEditorMode.AddMode ? "active" : ""}
        on:click={() => changeStore(AreasEditorMode.AddMode)}>{$LL.mapEditor.addButton()}</button
    >
    <button
        class={$areasEditorModeStore === AreasEditorMode.EditMode ? "active" : ""}
        on:click={() => changeStore(AreasEditorMode.EditMode)}>{$LL.mapEditor.editButton()}</button
    >
    <button
        class={$areasEditorModeStore === AreasEditorMode.RemoveMode ? "active" : ""}
        on:click={() => changeStore(AreasEditorMode.RemoveMode)}>{$LL.mapEditor.deleteButton()}</button
    >
</div>
{#if $areasEditorModeStore === AreasEditorMode.AddMode}
    {$LL.mapEditor.areaEditor.addInstructions()}
{/if}
{#if $areasEditorModeStore === AreasEditorMode.EditMode}
    <AreaPropertyEditor />
{/if}
{#if $areasEditorModeStore === AreasEditorMode.RemoveMode}
    {$LL.mapEditor.removeInstructions()}
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

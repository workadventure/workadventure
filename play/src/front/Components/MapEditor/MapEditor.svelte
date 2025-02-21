<script lang="ts">
    import { fly } from "svelte/transition";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import {
        mapEditorModeStore,
        mapEditorSelectedToolStore,
        mapEditorVisibilityStore,
    } from "../../Stores/MapEditorStore";
    import Explorer from "../Exploration/Explorer.svelte";
    import AreaEditor from "./AreaEditor/AreaEditor.svelte";
    import EntityEditor from "./EntityEditor/EntityEditor.svelte";
    import MapEditorSideBar from "./MapEditorSideBar.svelte";
    import TrashEditor from "./TrashEditor.svelte";
    import ConfigureMyRoom from "./WAMSettingsEditor.svelte";
    import { IconMinus } from "@wa-icons";

    function closeMapEditor() {
        analyticsClient.toggleMapEditor(false);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(undefined);
        mapEditorModeStore.switchMode(false);
    }
    function hideMapEditor() {
        mapEditorVisibilityStore.set(false);
    }
</script>

{#if $mapEditorSelectedToolStore === EditorToolName.WAMSettingsEditor}
    <ConfigureMyRoom />
{/if}
<div id="map-editor-container" class="flex flex-row items-start justify-end gap-4 absolute h-full top-0 right-0">
    <MapEditorSideBar />
    <div id="map-editor-right" class={`map-editor h-screen ${$mapEditorSelectedToolStore}`}>
        {#if $mapEditorVisibilityStore && $mapEditorSelectedToolStore !== EditorToolName.WAMSettingsEditor}
            <div
                class="sidebar h-screen bg-contrast/80 backdrop-blur-md"
                in:fly={{ x: 100, duration: 250, delay: 200 }}
                out:fly={{ x: 100, duration: 200 }}
            >
                {#if $mapEditorSelectedToolStore === EditorToolName.TrashEditor}
                    <TrashEditor />
                {/if}
                {#if $mapEditorSelectedToolStore === EditorToolName.EntityEditor}
                    <EntityEditor />
                {/if}
                {#if $mapEditorSelectedToolStore === EditorToolName.AreaEditor}
                    <AreaEditor />
                {/if}
                {#if $mapEditorSelectedToolStore === EditorToolName.ExploreTheRoom}
                    <Explorer />
                {/if}
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .map-editor {
        top: 0;
        right: 0;
        width: fit-content !important;
        z-index: 1999;
        pointer-events: auto;
        color: whitesmoke;

        button.close-window {
            right: 0.5rem;
        }

        &.WAMSettingsEditor {
            width: 80% !important;
            left: 10%;
            height: 0 !important;
        }

        .sidebar {
            position: relative !important;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 1.5em;
            width: 23em !important;
        }
    }
</style>

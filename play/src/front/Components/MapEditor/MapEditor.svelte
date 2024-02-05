<script lang="ts">
    import { fly } from "svelte/transition";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import {
        mapEditorModeStore,
        mapEditorSelectedToolStore,
        mapEditorVisibilityStore,
    } from "../../Stores/MapEditorStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import MapEditorSideBar from "./MapEditorSideBar.svelte";
    import EntityEditor from "./EntityEditor.svelte";
    import AreaEditor from "./AreaEditor.svelte";
    import ConfigureMyRoom from "./WAMSettingsEditor.svelte";
    import TrashEditor from "./TrashEditor.svelte";
    import Explorer from "./Explorer.svelte";

    function closeMapEditor() {
        analyticsClient.toggleMapEditor(false);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(undefined);
        mapEditorModeStore.switchMode(false);
    }
</script>

<MapEditorSideBar />
<div class={`map-editor tw-bg-dark-blue/95 ${$mapEditorSelectedToolStore}`}>
    {#if $mapEditorSelectedToolStore === EditorToolName.WAMSettingsEditor}
        <ConfigureMyRoom />
    {:else if $mapEditorVisibilityStore}
        {#if $mapEditorSelectedToolStore !== EditorToolName.ExploreTheRoom}
            <div class="sidebar" in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
                <button class="close-window" on:click={closeMapEditor}>&#215;</button>
                {#if $mapEditorSelectedToolStore === EditorToolName.TrashEditor}
                    <TrashEditor />
                {/if}
                {#if $mapEditorSelectedToolStore === EditorToolName.EntityEditor}
                    <EntityEditor />
                {/if}
                {#if $mapEditorSelectedToolStore === EditorToolName.AreaEditor}
                    <AreaEditor />
                {/if}
            </div>
        {:else if $mapEditorSelectedToolStore === EditorToolName.ExploreTheRoom}
            <div class="sidebar" in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
                <button class="close-window" on:click={closeMapEditor}>&#215;</button>
                <Explorer />
            </div>
        {/if}
    {/if}
</div>

<style lang="scss">
    .map-editor {
        position: absolute !important;
        top: 0;
        right: 0;
        width: fit-content !important;
        z-index: 425;

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

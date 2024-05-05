<script lang="ts">
    import { MinusIcon } from "svelte-feather-icons";
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

    function closeMapEditor() {
        analyticsClient.toggleMapEditor(false);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(undefined);
        mapEditorModeStore.switchMode(false);
    }
    function hideMapEditor() {
        mapEditorVisibilityStore.set(false);
    }
</script>

<MapEditorSideBar />
<div class={`map-editor tw-bg-dark-blue/95 ${$mapEditorSelectedToolStore}`}>
    {#if $mapEditorSelectedToolStore === EditorToolName.WAMSettingsEditor}
        <ConfigureMyRoom />
    {:else if $mapEditorVisibilityStore}
        <div class="sidebar" in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
            <button class="tw-absolute tw-right-10 tw-p-1 tw-cursor-pointer" on:click={hideMapEditor}
                ><MinusIcon size="20" /></button
            >
            <button class="close-window" data-testid="mapEditor-close-button" on:click={closeMapEditor}>&#215;</button>
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

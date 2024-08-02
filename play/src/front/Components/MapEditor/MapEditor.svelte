<script lang="ts">
    import { fly } from "svelte/transition";
    import { ArrowRightIcon } from "svelte-feather-icons";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import {
        mapEditorModeStore,
        mapEditorSelectedToolStore,
        mapEditorVisibilityStore,
    } from "../../Stores/MapEditorStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import Explorer from "../Exploration/Explorer.svelte";
    import MapEditorSideBar from "./MapEditorSideBar.svelte";
    import EntityEditor from "./EntityEditor.svelte";
    import AreaEditor from "./AreaEditor.svelte";
    import ConfigureMyRoom from "./WAMSettingsEditor.svelte";
    import TrashEditor from "./TrashEditor.svelte";

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
<div
    class={`map-editor h-full backdrop-blur text-center bg-contrast/80 absolute top-0 right-0 w-fit z-[425] pointer-events-auto text-white sidebar ${$mapEditorSelectedToolStore}`}
>
    {#if $mapEditorSelectedToolStore === EditorToolName.WAMSettingsEditor}
        <ConfigureMyRoom />
    {:else if $mapEditorVisibilityStore}
        <button class="absolute right-10 p-1 mt-4 cursor-pointer" on:click={hideMapEditor}
            ><ArrowRightIcon size="20" /></button
        >
        <div
            class="relative flex flex-col gap-4 sidebar h-full mt-12 p-2 w-[23rem]"
            in:fly={{ x: 100, duration: 250, delay: 200 }}
            out:fly={{ x: 100, duration: 200 }}
        >
            <!--<button class="close-window" on:click={closeMapEditor}>&#215;</button>-->
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
    // &.WAMSettingsEditor {
    //     width: 80% !important;
    //     left: 10%;
    //     height: 0 !important;
    // }
</style>

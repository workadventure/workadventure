<script lang="ts">
    import { fly } from "svelte/transition";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { mapEditorModeStore, mapEditorSelectedToolStore } from "../../Stores/MapEditorStore";
    import MapEditorSideBar from "./MapEditorSideBar.svelte";
    import EntityEditor from "./EntityEditor.svelte";
    import AreaEditor from "./AreaEditor.svelte";
    import ConfigureMyRoom from "./WAMSettingsEditor.svelte";
    import TrashEditor from "./TrashEditor.svelte";

    function closeChat() {
        mapEditorModeStore.switchMode(false);
    }
</script>

<MapEditorSideBar />
<div class={`map-editor tw-bg-dark-blue/95 ${$mapEditorSelectedToolStore}`}>
    {#if $mapEditorSelectedToolStore === EditorToolName.WAMSettingsEditor}
        <ConfigureMyRoom />
    {:else}
        <div class="sidebar" in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
            <button class="close-window" on:click={closeChat}>&#215;</button>
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

<script lang="ts">
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { mapEditorSelectedToolStore } from "../../Stores/MapEditorStore";
    import AreaPreviewWindow from "./AreaPreviewWindow.svelte";
    import PropertyPreviewSidebar from "./PropertyPreviewSidebar.svelte";
    import MapEditorSideBar from "./MapEditorSideBar.svelte";
    import MapEntityEditor from "./MapEntityEditor.svelte";
</script>

<MapEditorSideBar />
<div class="map-editor tw-bg-dark-blue/95">
    <div class="sidebar">
        {#if $mapEditorSelectedToolStore === EditorToolName.EntityEditor}
            <MapEntityEditor />
        {/if}
        {#if $mapEditorSelectedToolStore === EditorToolName.AreaEditor}
            <AreaPreviewWindow />
            <PropertyPreviewSidebar />
        {/if}
    </div>
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

<script lang="ts">
    import AreaPreviewWindow from "./AreaPreviewWindow.svelte";
    import MapEditorSideBar from "./MapEditorSideBar.svelte";
    import PropertyPreviewSidebar from "./PropertyPreviewSidebar.svelte";
    import ItemPicker from "./ItemPicker.svelte";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import {mapEditorSelectedToolStore} from "../../Stores/MapEditorStore";
</script>

<MapEditorSideBar />
<div class="map-editor tw-bg-dark-blue/95">
    <div class="sidebar">
        <!-- {#if $mapEditorSelectedToolStore === EditorToolName.FloorEditor } -->
            <ItemPicker/>
        <!-- {/if} -->
        {#if $mapEditorSelectedToolStore === EditorToolName.AreaEditor }
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
            flex-direction: row;
            // align-items: stretch;
            gap: 10px;
        }
    }
</style>

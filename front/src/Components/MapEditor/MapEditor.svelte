<script lang="ts">
    import AreaPreviewWindow from "./AreaPreviewWindow.svelte";
    import MapEditorSideBar from "./MapEditorSideBar.svelte";
    import PropertyPreviewSidebar from "./PropertyPreviewSidebar.svelte";

    // function close() {
    //     mapEditorModeStore.switchMode(false);
    // }
</script>

<div class="map-editor tw-bg-dark-blue/95">
    <div class="sidebar">
        <MapEditorSideBar />
        <AreaPreviewWindow />
        <PropertyPreviewSidebar />
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

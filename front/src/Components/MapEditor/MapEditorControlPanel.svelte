<script lang="ts">
    import { mapEditorModeStore } from "../../Stores/MapEditorStore";
    import AreaPreviewWindow from "./AreaPreviewWindow.svelte";

    function close() {
        mapEditorModeStore.switchMode(false);
    }
</script>

<div class="control-panel-window tw-bg-dark-blue/95 tw-rounded">
    <div class="control-panel-header">
        <button type="button" class="is-error close" on:click={close}>&times</button>
        <h2>Control Panel</h2>
    </div>
    <div class="control-panel-content">
        <AreaPreviewWindow />
    </div>
</div>

<style lang="scss">
    .control-panel-header {
        text-align: center;
        width: 100%;
        height: 150px;
        border: 1px solid black;
        border-radius: 10px;
    }
    .control-panel-content {
        margin-top: 5px;
        width: 100%;
        // height: 150px;
        // border: 1px solid black;
        // border-radius: 10px;
    }
    .control-panel-window {
        position: absolute;
        top: 0;
        float: left;
        // transform: translate(-50%, 0);
        width: 30% !important;
        height: 100% !important;
        // margin-top: 100px;
        z-index: 425;

        pointer-events: auto;
        color: whitesmoke;
    }
</style>

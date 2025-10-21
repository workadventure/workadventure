<script lang="ts">
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { mapEditorModeStore, mapExplorationModeStore } from "../../Stores/MapEditorStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { IconFocusCentered, IconMap, IconMinus, IconPlus } from "@wa-icons";

    function zoomIn() {
        analyticsClient.clickToZoomIn();

        const cameraManager = gameManager.getCurrentGameScene().getCameraManager();
        cameraManager.zoomByFactor(1.2, true);
    }

    function zoomOut() {
        analyticsClient.clickToZoomOut();

        const cameraManager = gameManager.getCurrentGameScene().getCameraManager();
        cameraManager.zoomByFactor(0.8, true);
    }

    function openMapExplorer() {
        analyticsClient.clickTopOpenMapExplorer();

        mapEditorModeStore.switchMode(true);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(EditorToolName.ExploreTheRoom);
    }

    function centerToUser() {
        analyticsClient.clickCenterToUser();

        mapEditorModeStore.switchMode(false);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(EditorToolName.CloseMapEditor);
    }
</script>

<div
    class="absolute bottom-2 right-2 bg-contrast backdrop-blur rounded pointer-events-auto overflow-hidden p-1"
    data-testid="actions-explorer"
>
    <div class="flex flex-col justify-center gap-2">
        <div class="flex flex-col justify-center gap-1">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                on:click={zoomIn}
            >
                <IconPlus />
            </div>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                on:click={zoomOut}
            >
                <IconMinus />
            </div>
        </div>
        {#if $mapExplorationModeStore === false}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                on:click={openMapExplorer}
            >
                <IconMap />
            </div>
        {:else}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                on:click={centerToUser}
            >
                <IconFocusCentered />
            </div>
        {/if}
    </div>
</div>

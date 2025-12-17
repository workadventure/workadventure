<script lang="ts">
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { mapEditorModeStore, mapExplorationModeStore } from "../../Stores/MapEditorStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import LL from "../../../i18n/i18n-svelte";
    import { IconFocusCentered, IconMapSearch, IconMinus, IconPlus } from "@wa-icons";

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
    class="absolute bottom-2 right-2 bg-contrast/80 rounded pointer-events-auto p-1 backdrop-blur hover:bg-contrast/100"
    data-testid="actions-explorer"
>
    <div class="flex flex-col justify-center gap-2">
        <div class="flex flex-col justify-center gap-1">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class="group flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                on:click={zoomIn}
            >
                <IconPlus />
                <div
                    class="-right-60 opacity-0 group-hover:opacity-90 group-hover:right-11 absolute bg-contrast backdrop-blur text-sm px-2 py-1 rounded whitespace-nowrap transition-all text-white pointer-events-none select-none"
                >
                    {$LL.mapEditor.explorer.zoomIn()}
                </div>
            </div>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class="group flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                on:click={zoomOut}
            >
                <IconMinus />
                <div
                    class="-right-60 opacity-0 group-hover:opacity-90 group-hover:right-11 absolute bg-contrast backdrop-blur text-sm px-2 py-1 rounded whitespace-nowrap transition-all text-white pointer-events-none select-none"
                >
                    {$LL.mapEditor.explorer.zoomOut()}
                </div>
            </div>
        </div>
        {#if $mapExplorationModeStore === false}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class="group flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                on:click={openMapExplorer}
            >
                <IconMapSearch />
                <div
                    class="-right-60 opacity-0 group-hover:opacity-90 group-hover:right-11 absolute bg-contrast backdrop-blur text-sm px-2 py-1 rounded whitespace-nowrap transition-all text-white pointer-events-none select-none"
                >
                    {$LL.mapEditor.explorer.title()}
                </div>
            </div>
        {:else}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class="group flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                on:click={centerToUser}
            >
                <IconFocusCentered />
                <div
                    class="-right-60 opacity-0 group-hover:opacity-90 group-hover:right-11 absolute bg-contrast backdrop-blur text-sm px-2 py-1 rounded whitespace-nowrap transition-all text-white pointer-events-none select-none"
                >
                    {$LL.mapEditor.explorer.showMyLocation()}
                </div>
            </div>
        {/if}
    </div>
</div>

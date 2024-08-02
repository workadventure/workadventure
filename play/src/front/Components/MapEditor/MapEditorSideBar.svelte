<script lang="ts">
    import { LocalizedString } from "typesafe-i18n";
    import { LL } from "../../../i18n/i18n-svelte";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { mapEditorSelectedToolStore, mapEditorVisibilityStore } from "../../Stores/MapEditorStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import AreaToolImg from "../images/icon-tool-area.png";
    // import FloorToolImg from "../images/icon-tool-floor.png";
    import EntityToolImg from "../images/icon-tool-entity.svg";
    import Tooltip from "../Util/Tooltip.svelte";
    import ConfigureImg from "../images/configure.svg";
    import TrashImg from "../images/trash.svg";
    import ExplorerImg from "../images/explorer.svg";
    import CloseImg from "../images/close.png";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { mapEditorActivated } from "../../Stores/MenuStore";

    const gameScene = gameManager.getCurrentGameScene();

    const availableTools: { toolName: EditorToolName; img: string; tooltiptext: LocalizedString }[] = [];

    $: console.log("mapEditorActivated", $mapEditorActivated);

    availableTools.push({
        toolName: EditorToolName.ExploreTheRoom,
        img: ExplorerImg,
        tooltiptext: $LL.mapEditor.sideBar.exploreTheRoom(),
    });
    if (!$mapEditorActivated) {
        availableTools.push({
            toolName: EditorToolName.AreaEditor,
            img: AreaToolImg,
            tooltiptext: $LL.mapEditor.sideBar.areaEditor(),
        });
        availableTools.push(
            {
                toolName: EditorToolName.EntityEditor,
                img: EntityToolImg,
                tooltiptext: $LL.mapEditor.sideBar.entityEditor(),
            }
            // NOTE: Hide it untill FloorEditing is done
            // { toolName: EditorToolName.FloorEditor, img: FloorToolImg, tooltiptext: $LL.mapEditor.sideBar.tileEditor() }
        );
        availableTools.push({
            toolName: EditorToolName.WAMSettingsEditor,
            img: ConfigureImg,
            tooltiptext: $LL.mapEditor.sideBar.configureMyRoom(),
        });
        availableTools.push({
            toolName: EditorToolName.TrashEditor,
            img: TrashImg,
            tooltiptext: $LL.mapEditor.sideBar.trashEditor(),
        });
    }
    availableTools.push({
        toolName: EditorToolName.CloseMapEditor,
        img: CloseImg,
        tooltiptext: $LL.mapEditor.sideBar.closeMapEditor(),
    });

    function switchTool(newTool: EditorToolName) {
        mapEditorVisibilityStore.set(true);
        analyticsClient.openMapEditorTool(newTool);
        gameScene.getMapEditorModeManager().equipTool(newTool);
    }
</script>

<section
    class="side-bar-container absolute right-[29rem] top-[10%] z-[500] pointer-events-auto "
    class:!right-20={!$mapEditorVisibilityStore}
>
    <div class="side-bar flex flex-col gap-4 w-fit h-fit absolute left-[2rem] align-bottom ">
        <div class="first-side-bar bg-contrast/80 backdrop-blur rounded-lg">
            {#each availableTools as tool (tool.toolName)}
                <div class="tool-button relative flex p-0 ">
                    <button
                        class="flex justify-center items-center h-12 w-12 p-2 m-0 "
                        id={tool.toolName}
                        on:click|preventDefault={() => switchTool(tool.toolName)}
                        type="button"
                    >
                        <img
                            src={tool.img}
                            alt="open tool {tool.toolName}"
                            class="object-contain scale-75 hover:scale-100 max-w-full max-h-full transition-transform duration-300"
                        />
                    </button>
                </div>
                <!-- <div class="">
                    <Tooltip text={tool.tooltiptext} leftPosition="true" />
                </div> -->
            {/each}
        </div>
        <div class="second-side-bar bg-contrast/80 backdrop-blur rounded-lg">
            {#each availableTools as tool (tool.toolName)}
                <div class="tool-button relative flex p-0">
                    <button
                        class="flex justify-center items-center h-12 w-12 p-2 m-0"
                        id={tool.toolName}
                        on:click|preventDefault={() => switchTool(tool.toolName)}
                        type="button"
                    >
                        <img
                            src={tool.img}
                            alt="open tool {tool.toolName}"
                            class="object-contain scale-75 hover:scale-100 max-w-full max-h-full transition-transform duration-300"
                        />
                    </button>
                    <!-- <div class="">
                    <Tooltip text={tool.tooltiptext} leftPosition="true" />
                </div> -->
                </div>
            {/each}
        </div>

        <div class="third-side-bar">

        </div>
    </div>
</section>

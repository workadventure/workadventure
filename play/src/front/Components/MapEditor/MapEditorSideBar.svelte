<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { mapEditorSelectedToolStore } from "../../Stores/MapEditorStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import AreaToolImg from "../images/icon-tool-area.png";
    import FloorToolImg from "../images/icon-tool-floor.png";
    import EntityToolImg from "../images/icon-tool-entity.svg";
    import ZoomInImg from "../images/zoom-in-icons.svg";
    import ZoomOutImg from "../images/zoom-out-icons.svg";
    import Tooltip from "../Util/Tooltip.svelte";
    import { ENABLE_MAP_EDITOR_AREAS_TOOL } from "../../Enum/EnvironmentVariable";
    import { LocalizedString } from "typesafe-i18n";

    const gameScene = gameManager.getCurrentGameScene();

    const availableTools: { toolName: EditorToolName; img: string; tooltiptext: LocalizedString }[] = [];

    if (ENABLE_MAP_EDITOR_AREAS_TOOL) {
        availableTools.push({
            toolName: EditorToolName.AreaEditor,
            img: AreaToolImg,
            tooltiptext: $LL.mapEditor.sideBar.areaEditor(),
        });
    }
    availableTools.push(
        {
            toolName: EditorToolName.EntityEditor,
            img: EntityToolImg,
            tooltiptext: $LL.mapEditor.sideBar.entityEditor(),
        },
        { toolName: EditorToolName.FloorEditor, img: FloorToolImg, tooltiptext: $LL.mapEditor.sideBar.tileEditor() }
    );

    function switchTool(newTool: EditorToolName) {
        console.log(JSON.stringify($LL));
        gameScene.getMapEditorModeManager().equipTool(newTool);
    }

    const zoomDelta = 10;
    function zoomIn() {
        gameScene.zoomByFactor(1 + (zoomDelta / 53) * 0.1);
    }
    function zoomOut() {
        gameScene.zoomByFactor(1 - (zoomDelta / 53) * 0.1);
    }
</script>

<section class="side-bar-container">
    <!--put a section to avoid lower div to be affected by some css-->
    <div class="side-bar">
        <div class="tool-button">
            <button on:click|preventDefault={zoomIn} type="button"
                ><img src={ZoomInImg} alt={$LL.mapEditor.sideBar.zoomIn()} /></button
            >
            <Tooltip text={$LL.mapEditor.sideBar.zoomIn()} rightPosition="true" />
        </div>
        <div class="tool-button">
            <button on:click|preventDefault={zoomOut} type="button"
                ><img src={ZoomOutImg} alt={$LL.mapEditor.sideBar.zoomOut()} /></button
            >
            <Tooltip text={$LL.mapEditor.sideBar.zoomOut()} rightPosition="true" />
        </div>
        {#each availableTools as tool (tool.toolName)}
            <div class="tool-button">
                <button
                    class={tool.toolName == $mapEditorSelectedToolStore ? "active" : ""}
                    on:click|preventDefault={() => switchTool(tool.toolName)}
                    type="button"><img src={tool.img} alt="open tool {tool.toolName}" /></button
                >
                <Tooltip text={tool.tooltiptext} rightPosition="true" />
            </div>
        {/each}
    </div>
</section>

<style lang="scss">
    .side-bar-container {
        position: absolute;
        bottom: 0;
        left: 0;
        pointer-events: auto;
    }
    .side-bar {
        display: flex;
        flex-direction: column;
        width: fit-content;
        height: fit-content;
        position: absolute;
        bottom: 10%;
        left: 2rem;
        align-content: bottom;
        .tool-button {
            position: relative !important;
            display: flex;
            padding: 0;
            button {
                height: 3em;
                width: 3em;
                padding: 10px;
                margin: 0;
                background-color: rgb(27 27 41 / 0.95);
                border-radius: 0;
                img {
                    object-fit: contain;
                    max-width: 100%;
                    max-height: 100%;
                }
            }
            button.active {
                background-color: rgb(45 45 65);
            }
        }
        .tool-button:first-child button {
            border-top-left-radius: 0.5em;
            border-top-right-radius: 0.5em;
        }
        .tool-button:last-child button {
            border-bottom-left-radius: 0.5em;
            border-bottom-right-radius: 0.5em;
        }
    }
</style>

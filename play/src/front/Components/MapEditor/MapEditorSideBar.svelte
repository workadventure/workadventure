<script lang="ts">
    import { LocalizedString } from "typesafe-i18n";
    import { LL } from "../../../i18n/i18n-svelte";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { mapEditorSelectedToolStore } from "../../Stores/MapEditorStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import AreaToolImg from "../images/icon-tool-area.png";
    // import FloorToolImg from "../images/icon-tool-floor.png";
    import EntityToolImg from "../images/icon-tool-entity.svg";
    import Tooltip from "../Util/Tooltip.svelte";
    import { ENABLE_MAP_EDITOR_AREAS_TOOL } from "../../Enum/EnvironmentVariable";
    import ConfigureImg from "../images/configure.svg";
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
        }
        // NOTE: Hide it untill FloorEditing is done
        // { toolName: EditorToolName.FloorEditor, img: FloorToolImg, tooltiptext: $LL.mapEditor.sideBar.tileEditor() }
    );
    availableTools.push({
        toolName: EditorToolName.WAMSettingsEditor,
        img: ConfigureImg,
        tooltiptext: $LL.mapEditor.sideBar.configureMyRoom(),
    });

    function switchTool(newTool: EditorToolName) {
        gameScene.getMapEditorModeManager().equipTool(newTool);
    }
</script>

<section class="side-bar-container">
    <!--put a section to avoid lower div to be affected by some css-->
    <div class="side-bar">
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

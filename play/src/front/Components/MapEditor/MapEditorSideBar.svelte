<script lang="ts">
    import { LocalizedString } from "typesafe-i18n";
    import { fly } from "svelte/transition";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { mapEditorSelectedToolStore, mapEditorVisibilityStore } from "../../Stores/MapEditorStore";
    import AreaToolImg from "../images/icon-tool-area.png";
    // import FloorToolImg from "../images/icon-tool-floor.png";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { mapEditorActivated, mapEditorActivatedForThematics } from "../../Stores/MenuStore";
    import Tooltip from "../Util/Tooltip.svelte";
    import CloseImg from "../images/close.png";
    import ConfigureImg from "../images/configure.svg";
    import ExplorerImg from "../images/explorer.svg";
    import EntityToolImg from "../images/icon-tool-entity.svg";
    import TrashImg from "../images/trash.svg";

    const gameScene = gameManager.getCurrentGameScene();

    const availableTools: { toolName: EditorToolName; img: string; tooltiptext: LocalizedString }[] = [];

    availableTools.push({
        toolName: EditorToolName.ExploreTheRoom,
        img: ExplorerImg,
        tooltiptext: $LL.mapEditor.sideBar.exploreTheRoom(),
    });

    const entityEditorTool = {
        toolName: EditorToolName.EntityEditor,
        img: EntityToolImg,
        tooltiptext: $LL.mapEditor.sideBar.entityEditor(),
    };
    const trashEditorTool = {
        toolName: EditorToolName.TrashEditor,
        img: TrashImg,
        tooltiptext: $LL.mapEditor.sideBar.trashEditor(),
    };

    if ($mapEditorActivatedForThematics && !$mapEditorActivated) {
        availableTools.push(entityEditorTool);
        availableTools.push(trashEditorTool);
    }

    if ($mapEditorActivated) {
        availableTools.push({
            toolName: EditorToolName.AreaEditor,
            img: AreaToolImg,
            tooltiptext: $LL.mapEditor.sideBar.areaEditor(),
        });
        availableTools.push(entityEditorTool);
        availableTools.push({
            toolName: EditorToolName.WAMSettingsEditor,
            img: ConfigureImg,
            tooltiptext: $LL.mapEditor.sideBar.configureMyRoom(),
        });
        availableTools.push(trashEditorTool);
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

<div
    class="!tw-flex !tw-fixed tw-justify-center !tw-w-full !tw-h-fit -tw-top-4"
    in:fly={{ y: 100, duration: 250, delay: 200 }}
    out:fly={{ y: 100, duration: 200 }}
>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="!tw-h-fit !tw-w-fit tw-rounded-2xl tw-bg-dark-purple/80 tw-backdrop-blur-lg tw-text-white tw-p-4 tw-pt-6"
    >
        {$LL.mapEditor.sideBar.mapManagerActivated()}
        <img
            src={CloseImg}
            class="tw-h-4 tw-ml-4 tw-pointer-events-auto tw-cursor-pointer"
            alt="Map Editor mode activated"
            on:click|preventDefault={() => switchTool(EditorToolName.CloseMapEditor)}
        />
    </div>
</div>

<section class="side-bar-container" class:!tw-right-20={!$mapEditorVisibilityStore}>
    <!--put a section to avoid lower div to be affected by some css-->
    <div class="side-bar">
        {#each availableTools as tool (tool.toolName)}
            <div class="tool-button">
                <button
                    id={tool.toolName}
                    class:active={$mapEditorSelectedToolStore === tool.toolName}
                    on:click|preventDefault={() => switchTool(tool.toolName)}
                    type="button"><img src={tool.img} alt="open tool {tool.toolName}" /></button
                >
                <Tooltip text={tool.tooltiptext} leftPosition="true" />
            </div>
        {/each}
    </div>
</section>

<style lang="scss">
    .side-bar-container {
        position: absolute;
        bottom: 0;
        right: 28rem;
        pointer-events: auto;
    }
    .side-bar {
        display: flex;
        flex-direction: column;
        width: fit-content;
        height: fit-content;
        position: absolute;
        top: 6%;
        left: 2rem;
        align-content: bottom;
        .tool-button {
            position: relative !important;
            display: flex;
            padding: 0;
            button {
                display: flex;
                justify-content: center;
                align-items: center;
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
                border-left: 4px solid #56eaff;
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
    #CloseMapEditor {
        img {
            width: 1.25rem;
        }
    }
</style>

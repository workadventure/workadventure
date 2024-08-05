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
    import { writable } from "svelte/store";
    import { onMount } from "svelte";

    const gameScene = gameManager.getCurrentGameScene();

    let isSelected = writable<EditorToolName | null>(null);

    const availableTools: { toolName: EditorToolName; img: string; tooltiptext: LocalizedString }[] = [];

    $: console.log("mapEditorActivated", $mapEditorActivated);

    availableTools.push({
        toolName: EditorToolName.ExploreTheRoom,
        img: ExplorerImg,
        tooltiptext: $LL.mapEditor.sideBar.exploreTheRoom(),
    });
    if ($mapEditorActivated) {
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

    onMount(() => {
        isSelected.set(EditorToolName.ExploreTheRoom);
    });

    function switchTool(newTool: EditorToolName) {
        mapEditorVisibilityStore.set(true);
        analyticsClient.openMapEditorTool(newTool);
        gameScene.getMapEditorModeManager().equipTool(newTool);
        isSelected.set(newTool);
    }
</script>

<section
    class="side-bar-container absolute right-[29rem] top-[10%] z-[500] pointer-events-auto "
    class:!right-20={!$mapEditorVisibilityStore}
>
    <div class="side-bar flex flex-col absolute left-[2rem] align-bottom">
        {#each availableTools as tool, index (tool.toolName)}
            {#if tool.toolName === EditorToolName.CloseMapEditor}
                <div class="tool-button p-1 h-fit relative mt-4 flex bg-contrast/80 backdrop-blur rounded-lg">
                    <button
                        class="close-button flex justify-start items-center h-12 w-12 p-2 m-0 hover:bg-white/10 hover:w-auto rounded-md transition-all duration-300 {$isSelected ===
                        tool.toolName
                            ? 'bg-secondary'
                            : ''}"
                        id={tool.toolName}
                        on:click|preventDefault={() => switchTool(tool.toolName)}
                        on:click|preventDefault={() => mapEditorVisibilityStore.set(false)}
                        type="button"
                    >
                        <img
                            src={tool.img}
                            alt="open tool {tool.toolName}"
                            class="object-contain scale-75 hover:scale-75 max-w-full max-h-full transition-transform duration-300"
                        />
                        <p class="ml-2 opacity-0 hover:opacity-100 transition-opacity duration-300 text-container">
                            Close the world
                        </p>
                    </button>
                </div>
            {:else}
                <div
                    class="tool-button w-fit p-1 h-fit bg-contrast/80 backdrop-blur {index === 0
                        ? 'rounded-t-lg'
                        : index === availableTools.length - 2
                        ? 'rounded-b-lg'
                        : ''}"
                >
                    <button
                        class="flex justify-center items-center h-12 w-12 p-2 m-0 hover:bg-white/10 rounded-md {$isSelected ===
                        tool.toolName
                            ? 'bg-secondary'
                            : ''}"
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
            {/if}
        {/each}
    </div>
</section>

<style>
    .close-button {
        width: 48px; /* Initial width to fit the cross */
        left: 0;
    }

    .close-button:hover {
        width: 200px; /* Adjust this width to fit the text */
        left: -152px; /* Negative value to move the button left by the expanded amount */
    }
    .text-container {
        display: none;
    }
    .close-button:hover .text-container {
        display: inline; /* Show text on hover */
        opacity: 1;
    }
</style>

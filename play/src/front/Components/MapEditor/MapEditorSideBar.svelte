<script lang="ts">
    import { onMount } from "svelte";
    // import { createPopperActions } from "svelte-popperjs";
    import { LocalizedString } from "typesafe-i18n";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { mapEditorSelectedToolStore, mapEditorVisibilityStore } from "../../Stores/MapEditorStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { mapEditorActivated, mapEditorActivatedForThematics } from "../../Stores/MenuStore";
    import AreaToolImg from "../images/icon-tool-area.png";
    import ConfigureImg from "../images/configure.svg";
    import EntityToolImg from "../images/icon-tool-entity.svg";
    import TrashImg from "../images/trash.svg";
    import MagnifyingGlassSvg from "../images/loupe.svg";
    import { IconX } from "@wa-icons";

    const availableTools: { toolName: EditorToolName; img: string; tooltiptext: LocalizedString }[] = [];
    // $: showTooltip = false;

    // const [popperRef, popperContent] = createPopperActions({
    //     placement: "left",
    //
    // });

    // const extraOpts = {
    //     modifiers: [
    //         { name: "offset", options: { offset: [0, 18] } },
    //     ],
    // };

    availableTools.push({
        toolName: EditorToolName.ExploreTheRoom,
        img: MagnifyingGlassSvg,
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

    // const popperActions = availableTools.map(() => createPopperActions({ placement: "left" }));

    function switchTool(newTool: EditorToolName) {
        // The map sidebar is opened when the user clicks on the explorer for the first time.
        // If the user clicks on the Explorer again, we need to show the map sidebar.
        if (newTool === EditorToolName.ExploreTheRoom) {
            mapEditorVisibilityStore.set(!$mapEditorVisibilityStore);
        } else {
            mapEditorVisibilityStore.set(true);
        }
        analyticsClient.openMapEditorTool(newTool);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(newTool);
    }

    onMount(() => {
        // showTooltip = true;
    });
</script>

<!--<div-->
<!--    class="!flex !fixed justify-center !w-full !h-fit bottom-0">-->
<!--    &lt;!&ndash; svelte-ignore a11y-click-events-have-key-events &ndash;&gt;-->
<!--    <div-->
<!--        class="flex items-center !h-fit !w-fit rounded-t-2xl bg-dark-purple/80 backdrop-blur-lg text-white p-4 pt-6 gap-2"-->
<!--    >-->
<!--        {#each availableTools as tool (tool.toolName)}-->
<!--            {#if $mapEditorSelectedToolStore === tool.toolName}-->
<!--                <img src={tool.img} class="w-fit h-4" alt="open tool {tool.toolName}" />-->
<!--            {/if}-->
<!--        {/each}-->
<!--        {#if $mapEditorSelectedToolStore === EditorToolName.ExploreTheRoom}-->
<!--            {$LL.mapEditor.sideBar.exploreTheRoomActivated()}-->
<!--        {:else if $mapEditorSelectedToolStore === EditorToolName.AreaEditor}-->
<!--            {$LL.mapEditor.sideBar.areaEditorActivated()}-->
<!--        {:else if $mapEditorSelectedToolStore === EditorToolName.EntityEditor}-->
<!--            {$LL.mapEditor.sideBar.entityEditorActivated()}-->
<!--        {:else if $mapEditorSelectedToolStore === EditorToolName.TrashEditor}-->
<!--            {$LL.mapEditor.sideBar.trashEditorActivated()}-->
<!--        {:else if $mapEditorSelectedToolStore === EditorToolName.WAMSettingsEditor}-->
<!--            {$LL.mapEditor.sideBar.configureMyRoomActivated()}-->
<!--        {:else}-->
<!--            {$LL.mapEditor.sideBar.mapManagerActivated()}-->
<!--        {/if}-->
<!--        <img-->
<!--            src={CloseImg}-->
<!--            class="h-4 ml-4 pointer-events-auto cursor-pointer"-->
<!--            alt={$LL.mapEditor.sideBar.closeMapEditor()}-->
<!--            on:click|preventDefault={() => switchTool(EditorToolName.CloseMapEditor)}-->
<!--        />-->
<!--    </div>-->
<!--</div>-->

<section class="side-bar-container z-[1999]" class:!right-20={!$mapEditorVisibilityStore}>
    <!--put a section to avoid lower div to be affected by some css-->
    <div class="flex flex-col items-center gap-4 pt-24 side-bar">
        <div class="close-window p-2 bg-contrast/80 rounded-2xl backdrop-blur-md">
            <button
                class="p-3 hover:bg-white/10 rounded aspect-square w-12 m-0"
                data-testid="closeMapEditorButton"
                on:click|preventDefault={() => switchTool(EditorToolName.CloseMapEditor)}
            >
                <IconX font-size="20" />
            </button>
        </div>
        <div class="p-2 bg-contrast/80 rounded-2xl flex flex-col gap-2 backdrop-blur-md">
            {#each availableTools as tool (tool.toolName)}
                <div class="tool-button relative">
                    <button
                        class="peer p-3 aspect-square w-12 rounded {$mapEditorSelectedToolStore === tool.toolName
                            ? 'bg-secondary'
                            : 'hover:bg-white/10'}"
                        id={tool.toolName}
                        class:active={$mapEditorSelectedToolStore === tool.toolName}
                        on:click|preventDefault={() => switchTool(tool.toolName)}
                        type="button"
                    >
                        <img class="h-6 w-6" src={tool.img} alt="open tool {tool.toolName}" />
                    </button>
                    <div
                        class=" bg-contrast/90 backdrop-blur-xl text-white tooltip absolute text-nowrap p-2 invisible opacity-0 transition-all peer-hover:visible peer-hover:opacity-100 rounded top-1/2 -translate-y-1/2 right-[130%] "
                    >
                        {tool.tooltiptext}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section>

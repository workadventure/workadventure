<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { ComponentType } from "svelte";
    // import { createPopperActions } from "svelte-popperjs";
    import type { LocalizedString } from "typesafe-i18n";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { EditorToolName } from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { mapEditorSelectedToolStore, mapEditorVisibilityStore } from "../../Stores/MapEditorStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { mapEditorActivated, mapEditorActivatedForThematics } from "../../Stores/MenuStore";
    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import { IconX, IconTexture, IconLamp, IconMapSearch, IconSettings, IconTrash } from "@wa-icons";

    const availableTools: { toolName: EditorToolName; iconComponent: ComponentType; tooltiptext: LocalizedString }[] =
        [];

    availableTools.push({
        toolName: EditorToolName.ExploreTheRoom,
        iconComponent: IconMapSearch,
        tooltiptext: $LL.mapEditor.sideBar.exploreTheRoom(),
    });

    const entityEditorTool = {
        toolName: EditorToolName.EntityEditor,
        iconComponent: IconLamp,
        tooltiptext: $LL.mapEditor.sideBar.entityEditor(),
    };
    const trashEditorTool = {
        toolName: EditorToolName.TrashEditor,
        iconComponent: IconTrash,
        tooltiptext: $LL.mapEditor.sideBar.trashEditor(),
    };

    $: if ($mapEditorActivatedForThematics && !$mapEditorActivated) {
        availableTools.push(entityEditorTool);
        availableTools.push(trashEditorTool);
    }

    $: if ($mapEditorActivated && !isMobile) {
        availableTools.push({
            toolName: EditorToolName.AreaEditor,
            iconComponent: IconTexture,
            tooltiptext: $LL.mapEditor.sideBar.areaEditor(),
        });
        availableTools.push(entityEditorTool);
        availableTools.push({
            toolName: EditorToolName.WAMSettingsEditor,
            iconComponent: IconSettings,
            tooltiptext: $LL.mapEditor.sideBar.configureMyRoom(),
        });
        availableTools.push(trashEditorTool);
    }

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

    let sectionSideBarContainer: HTMLElement;
    let isMobile = isMediaBreakpointUp("md");
    const resizeObserver = new ResizeObserver(() => {
        isMobile = isMediaBreakpointUp("md");
    });

    onMount(() => {
        resizeObserver.observe(sectionSideBarContainer);
    });

    onDestroy(() => {
        resizeObserver.unobserve(sectionSideBarContainer);
    });
</script>

<section
    bind:this={sectionSideBarContainer}
    class="side-bar-container z-[1999] pointer-events-auto"
    class:!right-20={!$mapEditorVisibilityStore}
>
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
                        <svelte:component this={tool.iconComponent} font-size="22" />
                    </button>
                    <div
                        class=" bg-contrast/90 backdrop-blur-xl text-white tooltip absolute text-nowrap p-2 invisible opacity-0 transition-all peer-hover:visible peer-hover:opacity-100 rounded top-1/2 -translate-y-1/2 right-[130%]"
                    >
                        {tool.tooltiptext}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section>

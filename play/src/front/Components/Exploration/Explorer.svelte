<script lang="ts">
    import { writable } from "svelte/store";
    import { onMount } from "svelte";
    import { OpenWebsitePropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../i18n/i18n-svelte";
    import AreaToolImg from "../images/icon-tool-area.png";
    import EntityToolImg from "../images/icon-tool-entity.svg";
    import {
        mapExplorationAreasStore,
        mapExplorationEntitiesStore,
        mapExplorationObjectSelectedStore,
    } from "../../Stores/MapEditorStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { Entity } from "../../Phaser/ECS/Entity";
    import { AreaPreview } from "../../Phaser/Components/MapEditor/AreaPreview";
    import { ExplorerTool } from "../../Phaser/Game/MapEditor/Tools/ExplorerTool";
    import AddPropertyButtonWrapper from "../MapEditor/PropertyEditor/AddPropertyButtonWrapper.svelte";
    import { connectionManager } from "../../Connection/ConnectionManager";
    import { mapExplorerSearchinputFocusStore } from "../../Stores/UserInputStore";
    import { IconChevronDown, IconChevronUp } from "@wa-icons";

    let filter = "";
    let selectFilters = writable<Array<string>>(new Array<string>());
    let entitiesListFiltered = writable<Map<string, Entity>>(new Map());
    let areasListFiltered = writable<Map<string, AreaPreview>>(new Map());

    onMount(() => {
        init();
    });

    function init() {
        entitiesListFiltered.set($mapExplorationEntitiesStore);
        if ($mapExplorationAreasStore) areasListFiltered.set($mapExplorationAreasStore);
    }

    function onChangeFilterHandle() {
        entitiesListFiltered.set(new Map());
        for (let [key, entity] of $mapExplorationEntitiesStore) {
            // Check filter by name
            if (filter && filter != "" && entity.getPrefab().name.toLowerCase().indexOf(filter.toLowerCase()) == -1)
                continue;

            // Check filter by properties
            if ($selectFilters.length == 0) {
                $entitiesListFiltered.set(key, entity);
                continue;
            } else {
                // Check if the entity has the selected properties
                for (let filter of $selectFilters) {
                    if (
                        entity
                            .getProperties()
                            .find((p) => p.type === filter || (p as OpenWebsitePropertyData).application === filter)
                    )
                        $entitiesListFiltered.set(key, entity);
                }
            }
        }

        areasListFiltered.set(new Map());
        if ($mapExplorationAreasStore) {
            for (let [key, area] of $mapExplorationAreasStore) {
                // Set area if the name match the filter and if the area has the selected properties
                if (filter && filter != "" && area.getAreaData().name.toLowerCase().indexOf(filter.toLowerCase()) == -1)
                    continue;

                // Check filter by properties
                if ($selectFilters.length == 0) {
                    $areasListFiltered.set(key, area);
                    continue;
                } else {
                    // Check if the area has the selected properties
                    for (let filter of $selectFilters) {
                        if (
                            area
                                .getProperties()
                                .find((p) => p.type === filter || (p as OpenWebsitePropertyData).application === filter)
                        )
                            $areasListFiltered.set(key, area);
                    }
                }
            }
        }
    }

    function addFilter(filterName: string) {
        selectFilters.update((filters) => {
            if (filters.includes(filterName)) {
                return filters.filter((f) => f !== filterName);
            }
            return [...filters, filterName];
        });
        onChangeFilterHandle();
    }
    let entityListActive = false;
    let areaListActive = false;
    function toggleEntityList() {
        entityListActive = !entityListActive;
    }
    function toggleAreaList() {
        areaListActive = !areaListActive;
    }

    function highlightEntity(entity: Entity) {
        entity.setPointedToEditColor(0xf9e82d);
        gameManager.getCurrentGameScene().getCameraManager().centerCameraOn(entity);
        // Use explorer tool to define the zoom to center camera position
        (
            gameManager.getCurrentGameScene().getMapEditorModeManager().currentlyActiveTool as ExplorerTool
        ).defineZoomToCenterCameraPosition();
    }
    function unhighlightEntity(entity: Entity) {
        // Don't unhighlight if the entity is selected
        if ($mapExplorationObjectSelectedStore == entity) return;

        entity.setPointedToEditColor(0x00000);
        gameManager.getCurrentGameScene().markDirty();
    }
    function highlightArea(area: AreaPreview) {
        area.setStrokeStyle(2, 0xf9e82d);
        gameManager.getCurrentGameScene().getCameraManager().centerCameraOn(area);
        // Use explorer tool to define the zoom to center camera position
        (
            gameManager.getCurrentGameScene().getMapEditorModeManager().currentlyActiveTool as ExplorerTool
        ).defineZoomToCenterCameraPosition();
    }
    function unhighlightArea(area: AreaPreview) {
        // Don't unhighlight if the area is selected
        if ($mapExplorationObjectSelectedStore == area) return;

        area.setStrokeStyle(2, 0x000000);
        gameManager.getCurrentGameScene().markDirty();
    }

    // Prevent the input form to be focused when clicking on the filter input
    // The UserInputManager service automatically focus the input form when a click event is detected
    // When user looking for entities or areas, we don't move the player
    function focusin(event: FocusEvent) {
        event.stopImmediatePropagation();
        event.preventDefault();
        mapExplorerSearchinputFocusStore.set(true);
    }
    function focusout(event: FocusEvent) {
        event.stopImmediatePropagation();
        event.preventDefault();
        mapExplorerSearchinputFocusStore.set(false);
    }
</script>

<div class="mapexplorer flex flex-col overflow-auto">
    <div class="header-container">
        <h3 class="text-l text-left">{$LL.mapEditor.explorer.title()}</h3>
    </div>
    <div class="flex flex-col justify-center">
        <div class="flex flex-col justify-center items-center">
            <input
                class="filter-input h-8 m-5"
                type="search"
                bind:value={filter}
                on:input={onChangeFilterHandle}
                on:focusin={focusin}
                on:focusout={focusout}
                placeholder={$LL.mapEditor.entityEditor.itemPicker.searchPlaceholder()}
            />
        </div>

        <div class="flex flex-row overflow-y-hidden overflow-x-scroll">
            <AddPropertyButtonWrapper
                property="personalAreaPropertyData"
                isActive={$selectFilters.includes("personalAreaPropertyData")}
                on:click={() => addFilter("personalAreaPropertyData")}
            />
            <AddPropertyButtonWrapper
                property="restrictedRightsPropertyData"
                isActive={$selectFilters.includes("restrictedRightsPropertyData")}
                on:click={() => addFilter("restrictedRightsPropertyData")}
            />
            <AddPropertyButtonWrapper
                property="jitsiRoomProperty"
                isActive={$selectFilters.includes("jitsiRoomProperty")}
                on:click={() => {
                    addFilter("jitsiRoomProperty");
                }}
            />
            <AddPropertyButtonWrapper
                property="playAudio"
                isActive={$selectFilters.includes("playAudio")}
                on:click={() => {
                    addFilter("playAudio");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                isActive={$selectFilters.includes("openWebsite")}
                on:click={() => {
                    addFilter("openWebsite");
                }}
            />
            <AddPropertyButtonWrapper
                property="speakerMegaphone"
                isActive={$selectFilters.includes("speakerMegaphone")}
                on:click={() => {
                    addFilter("speakerMegaphone");
                }}
            />
            <AddPropertyButtonWrapper
                property="listenerMegaphone"
                isActive={$selectFilters.includes("listenerMegaphone")}
                on:click={() => {
                    addFilter("listenerMegaphone");
                }}
            />
            <AddPropertyButtonWrapper
                property="exit"
                isActive={$selectFilters.includes("exit")}
                on:click={() => {
                    addFilter("exit");
                }}
            />
            <AddPropertyButtonWrapper
                property="start"
                isActive={$selectFilters.includes("start")}
                on:click={() => {
                    addFilter("start");
                }}
            />
            <AddPropertyButtonWrapper
                property="focusable"
                isActive={$selectFilters.includes("focusable")}
                on:click={() => {
                    addFilter("focusable");
                }}
            />
            <AddPropertyButtonWrapper
                property="matrixRoomPropertyData"
                isActive={$selectFilters.includes("matrixRoomPropertyData")}
                on:click={() => {
                    addFilter("matrixRoomPropertyData");
                }}
            />

            {#each connectionManager.applications as app, index (`my-own-app-${index}`)}
                <AddPropertyButtonWrapper
                    property="openWebsite"
                    subProperty={app.name}
                    on:click={() => {
                        addFilter(app.name);
                    }}
                />
            {/each}
        </div>

        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="entities p-4 rounded-2xl flex flex-row justify-around items-center cursor-pointer"
            on:click={toggleEntityList}
        >
            <img class="w-10 h-auto mr-2 pointer-events-none" src={EntityToolImg} alt="link icon" />
            {#if $entitiesListFiltered.size > 0}
                <span class="pointer-events-none"
                    >{$entitiesListFiltered.size}
                    {$LL.mapEditor.explorer.entitiesFound($entitiesListFiltered.size > 1)}</span
                >
                {#if entityListActive}
                    <IconChevronDown class="pointer-events-none" font-size="32" />
                {:else}
                    <IconChevronUp class="pointer-events-none" font-size="32" />
                {/if}
            {:else}
                <p class="m-0">{$LL.mapEditor.explorer.noEntitiesFound()}</p>
            {/if}
        </div>

        {#if entityListActive && $entitiesListFiltered.size > 0}
            <div class="entity-items p-4 flex flex-col">
                {#each [...$entitiesListFiltered] as [key, entity] (key)}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        id={entity.entityId}
                        on:mouseenter={() => highlightEntity(entity)}
                        on:mouseleave={() => unhighlightEntity(entity)}
                        on:click={() => mapExplorationObjectSelectedStore.set(entity)}
                        class="item p-4 rounded-2xl flex flex-row justify-around items-center cursor-pointer"
                    >
                        <img
                            class="w-10 h-auto mr-2 pointer-events-none"
                            src={entity.getPrefab().imagePath}
                            alt="link icon"
                        />
                        <span class="pointer-events-none font-bold"
                            >{entity.getEntityData().name ?? entity.getPrefab().name}</span
                        >
                    </div>
                {/each}
            </div>
        {/if}

        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="areas p-4 rounded-2xl flex flex-row justify-around items-center cursor-pointer"
            on:click={toggleAreaList}
        >
            <img class="w-10 h-auto mr-2 pointer-events-none" src={AreaToolImg} alt="link icon" />
            {#if $areasListFiltered.size > 0}
                <span class="pointer-events-none"
                    >{$areasListFiltered.size}
                    {$LL.mapEditor.explorer.areasFound($areasListFiltered.size > 1)}</span
                >
                {#if areaListActive}
                    <IconChevronDown class="pointer-events-none" font-size="32" />
                {:else}
                    <IconChevronUp class="pointer-events-none" font-size="32" />
                {/if}
            {:else}
                <p class="m-0">{$LL.mapEditor.explorer.noAreasFound()}</p>
            {/if}
        </div>
        {#if areaListActive && $areasListFiltered.size > 0}
            <div class="area-items p-4 flex flex-col">
                {#if $areasListFiltered.size > 0}
                    {#each [...$areasListFiltered] as [key, area] (key)}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            id={key}
                            on:mouseenter={() => highlightArea(area)}
                            on:mouseleave={() => unhighlightArea(area)}
                            on:click={() => mapExplorationObjectSelectedStore.set(area)}
                            class="item p-4 rounded-2xl flex flex-row justify-around items-center cursor-pointer"
                        >
                            <img class="w-10 h-auto mr-2 pointer-events-none" src={AreaToolImg} alt="link icon" />
                            <span
                                class="pointer-events-none w-32"
                                class:italic={!area.getAreaData().name || area.getAreaData().name == ""}
                                class:font-bold={area.getAreaData().name && area.getAreaData().name != ""}
                            >
                                {area.getAreaData().name || "No name"}
                            </span>
                        </div>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .entities,
    .areas {
        &:hover {
            background-color: #4156f6;
        }
    }
    .entity-items,
    .area-items {
        div:hover {
            background-color: #4156f6;
        }
    }

    .mapexplorer {
        scrollbar-width: 20px;
        scrollbar-color: rgb(0 0 0 / 0.8) rgb(0 0 0 / 0.2);
    }
    .mapexplorer::-webkit-scrollbar {
        width: 20px;
    }
    .mapexplorer::-webkit-scrollbar-track {
        background-color: transparent;
    }
    .mapexplorer::-webkit-scrollbar-thumb {
        background-color: rgb(0 0 0 / 0.5);
        border-radius: 20px;
        border: 6px solid transparent;
        background-clip: content-box;
        cursor: grab;
    }
    .mapexplorer::-webkit-scrollbar-thumb:hover {
        background-color: rgb(0 0 0 / 1);
    }
</style>

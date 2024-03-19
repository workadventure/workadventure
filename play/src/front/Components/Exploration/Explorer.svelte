<script lang="ts">
    import { writable } from "svelte/store";
    import { ChevronDownIcon, ChevronUpIcon } from "svelte-feather-icons";
    import { onMount } from "svelte";
    import { fly } from "svelte/transition";
    import { LL } from "../../../i18n/i18n-svelte";
    import visioSvg from "../images/loupe.svg";
    import ExplorerImg from "../images/explorer.svg";
    import AreaToolImg from "../images/icon-tool-area.png";
    import EntityToolImg from "../images/icon-tool-entity.svg";
    import {
        mapExplorationEntitiesStore,
        mapEditorVisibilityStore,
        mapExplorationObjectSelectedStore,
        mapExplorationAreasStore,
    } from "../../Stores/MapEditorStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { Entity } from "../../Phaser/ECS/Entity";
    import { AreaPreview } from "../../Phaser/Components/MapEditor/AreaPreview";
    import { ExplorerTool } from "../../Phaser/Game/MapEditor/Tools/ExplorerTool";
    import AddPropertyButtonWrapper from "../MapEditor/PropertyEditor/AddPropertyButtonWrapper.svelte";

    let filter = "";
    let selectFilters = writable<Array<string>>(new Array<string>());
    let entitessListFiltered = writable<Map<string, Entity>>(new Map());
    let areasListFiltered = writable<Map<string, AreaPreview>>(new Map());
    let showSearchMode = false;

    onMount(() => {
        init();
    });

    function init() {
        entitessListFiltered.set($mapExplorationEntitiesStore);
        if ($mapExplorationAreasStore) areasListFiltered.set($mapExplorationAreasStore);
    }

    function onChangeFilterHandle() {
        entitessListFiltered.set(new Map());
        for (let [key, entity] of $mapExplorationEntitiesStore) {
            // Check filter by name
            if (filter && filter != "" && entity.getPrefab().name.toLowerCase().indexOf(filter.toLowerCase()) == -1)
                continue;

            // Check filter by properties
            if ($selectFilters.length == 0) {
                $entitessListFiltered.set(key, entity);
                continue;
            } else {
                // Check if the entity has the selected properties
                for (let filter of $selectFilters) {
                    if (entity.getProperties().find((p) => p.type === filter)) $entitessListFiltered.set(key, entity);
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
                        if (area.getProperties().find((p) => p.type === filter)) $areasListFiltered.set(key, area);
                    }
                }
            }
        }
    }

    function explorationMode() {
        mapEditorVisibilityStore.set(false);
    }
    function toggleSearchMode() {
        showSearchMode = !showSearchMode;
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
        gameManager.getCurrentGameScene().getCameraManager().goToEntity(entity);
        // Use explorer tool to define the zoom to center camera position
        (
            gameManager.getCurrentGameScene().getMapEditorModeManager().currentlyActiveTool as ExplorerTool
        ).defineZoomToCenterCameraPosition();
    }
    function unhighlightEntity(entity: Entity) {
        // Don't unhighlight if the entity is selected
        if ($mapExplorationObjectSelectedStore == entity) return;

        entity.setPointedToEditColor(0x000000);
        gameManager.getCurrentGameScene().markDirty();
    }
    function highlightArea(area: AreaPreview) {
        area.setStrokeStyle(2, 0xf9e82d);
        gameManager.getCurrentGameScene().getCameraManager().goToAreaPreviex(area);
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
</script>

<div class="flex flex-col">
    <div class="header-container">
        <h3 class="text-l text-left">{$LL.mapEditor.explorer.title()}</h3>
        {#if !showSearchMode}
            <p in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
                {$LL.mapEditor.explorer.description()}
            </p>
        {/if}
    </div>
    <div class="flex flex-col justify-center">
        <div class="flex flex-wrap justify-center items-center">
            {#if !showSearchMode}
                <div
                    class="properties-buttons flex flex-row z-10"
                    in:fly={{ x: 100, duration: 250, delay: 200 }}
                    out:fly={{ x: 100, duration: 200 }}
                >
                    <button
                        class="add-property-button tooltip p-4 flex justify-center items-center"
                        on:click={explorationMode}
                    >
                        <div class="w-10 h-10 flex flex-wrap items-center justify-center">
                            <img draggable="false" class="max-w-[75%] max-h-[75%]" src={ExplorerImg} alt="info icon" />
                        </div>
                        <span class="tooltiptext text-xs">
                            <p class="text-sm mb-2">{$LL.mapEditor.explorer.explorationModeTitle()}</p>
                            {$LL.mapEditor.explorer.explorationModeDescription()}
                        </span>
                    </button>
                </div>
            {/if}
            <div
                class="properties-buttons flex flex-row z-10"
                in:fly={{ x: 100, duration: 250, delay: 200 }}
                out:fly={{ x: 100, duration: 200 }}
            >
                <button
                    class="add-property-button tooltip p-4 flex justify-center items-center"
                    on:click={toggleSearchMode}
                >
                    <div class="w-10 h-10 flex flex-wrap items-center justify-center">
                        <img draggable="false" class="max-w-[75%] max-h-[75%]" src={visioSvg} alt="info icon" />
                    </div>
                    <span class="tooltiptext text-xs">
                        <p class="text-sm mb-2">{$LL.mapEditor.explorer.searchModeTitle()}</p>
                        {$LL.mapEditor.explorer.searchModeDescription()}
                    </span>
                </button>
            </div>
        </div>

        {#if showSearchMode}
            <div class="flex flex-col justify-center items-center">
                <input
                    class="filter-input h-8 m-5"
                    type="search"
                    bind:value={filter}
                    on:input={onChangeFilterHandle}
                    placeholder={$LL.mapEditor.entityEditor.itemPicker.searchPlaceholder()}
                />
            </div>

            <div class="flex flex-row overflow-y-hidden overflow-x-scroll">
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
                        addFilter("silent");
                    }}
                />
                <AddPropertyButtonWrapper
                    property="focusable"
                    isActive={$selectFilters.includes("focusable")}
                    on:click={() => {
                        addFilter("focusable");
                    }}
                />
            </div>

            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="entities p-4 rounded-2xl flex flex-row justify-around items-center cursor-pointer"
                on:click={toggleEntityList}
            >
                <img class="w-10 h-auto mr-2 pointer-events-none" src={EntityToolImg} alt="link icon" />
                {#if $entitessListFiltered.size > 0}
                    <span class="pointer-events-none"
                        >{$entitessListFiltered.size}
                        {$LL.mapEditor.explorer.entitiesFound($entitessListFiltered.size > 1)}</span
                    >
                    {#if entityListActive}
                        <ChevronDownIcon class="pointer-events-none" size="32" />
                    {:else}
                        <ChevronUpIcon class="pointer-events-none" size="32" />
                    {/if}
                {:else}
                    <p class="m-0">{$LL.mapEditor.explorer.noEntitiesFound()}</p>
                {/if}
            </div>

            {#if entityListActive && $entitessListFiltered.size > 0}
                <div class="entity-items p-4 flex flex-col">
                    {#each [...$entitessListFiltered] as [key, entity] (key)}
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
                        <ChevronDownIcon class="pointer-events-none" size="32" />
                    {:else}
                        <ChevronUpIcon class="pointer-events-none" size="32" />
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
        {/if}
    </div>
</div>

<style lang="scss">
    .add-property-button {
        --border-opacity: 1;
        border-color: rgb(77 75 103 / var(--border-opacity));
        --bg-opacity: 1;
        background-color: rgb(27 27 41 / var(--bg-opacity));
        --text-opacity: 1;
        color: gray;
        border-radius: 10px;
        position: relative;
        display: flex;
        flex-direction: column;

        .tooltiptext {
            top: 100%;
            bottom: 0;
            padding: 0.5rem 0.25rem;
            height: fit-content;
            &::after {
                bottom: 100%;
                top: auto;
                transform: rotate(180deg);
            }
        }
    }

    button:disabled {
        pointer-events: all;
        cursor: default;

        div {
            cursor: default;
        }

        img {
            opacity: 0.5;
            cursor: default;
        }
        .tooltiptext {
            cursor: default;
        }
    }

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
</style>

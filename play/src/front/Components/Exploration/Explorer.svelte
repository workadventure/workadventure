<script lang="ts">
    import { writable } from "svelte/store";
    import { ChevronDownIcon, ChevronUpIcon } from "svelte-feather-icons";
    import { onMount } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import AreaToolImg from "../images/icon-tool-area.png";
    import EntityToolImg from "../images/icon-tool-entity.svg";
    import {
        mapExplorationEntitiesStore,
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
                    if (entity.getProperties().find((p) => p.type === filter)) $entitiesListFiltered.set(key, entity);
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

<div class="tw-flex tw-flex-col">
    <div class="header-container">
        <h3 class="tw-text-l tw-text-left">{$LL.mapEditor.explorer.title()}</h3>
    </div>
    <div class="tw-flex tw-flex-col tw-justify-center">
        <div class="tw-flex tw-flex-col tw-justify-center tw-items-center">
            <input
                class="filter-input tw-h-8 tw-m-5"
                type="search"
                bind:value={filter}
                on:input={onChangeFilterHandle}
                placeholder={$LL.mapEditor.entityEditor.itemPicker.searchPlaceholder()}
            />
        </div>

        <div class="tw-flex tw-flex-row tw-overflow-y-hidden tw-overflow-x-scroll">
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
            class="entities tw-p-4 tw-rounded-2xl tw-flex tw-flex-row tw-justify-around tw-items-center tw-cursor-pointer"
            on:click={toggleEntityList}
        >
            <img class="tw-w-10 tw-h-auto tw-mr-2 tw-pointer-events-none" src={EntityToolImg} alt="link icon" />
            {#if $entitiesListFiltered.size > 0}
                <span class="tw-pointer-events-none"
                    >{$entitiesListFiltered.size}
                    {$LL.mapEditor.explorer.entitiesFound($entitiesListFiltered.size > 1)}</span
                >
                {#if entityListActive}
                    <ChevronDownIcon class="tw-pointer-events-none" size="32" />
                {:else}
                    <ChevronUpIcon class="tw-pointer-events-none" size="32" />
                {/if}
            {:else}
                <p class="tw-m-0">{$LL.mapEditor.explorer.noEntitiesFound()}</p>
            {/if}
        </div>

        {#if entityListActive && $entitiesListFiltered.size > 0}
            <div class="entity-items tw-p-4 tw-flex tw-flex-col">
                {#each [...$entitiesListFiltered] as [key, entity] (key)}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        id={entity.entityId}
                        on:mouseenter={() => highlightEntity(entity)}
                        on:mouseleave={() => unhighlightEntity(entity)}
                        on:click={() => mapExplorationObjectSelectedStore.set(entity)}
                        class="item tw-p-4 tw-rounded-2xl tw-flex tw-flex-row tw-justify-around tw-items-center tw-cursor-pointer"
                    >
                        <img
                            class="tw-w-10 tw-h-auto tw-mr-2 tw-pointer-events-none"
                            src={entity.getPrefab().imagePath}
                            alt="link icon"
                        />
                        <span class="tw-pointer-events-none tw-font-bold"
                            >{entity.getEntityData().name ?? entity.getPrefab().name}</span
                        >
                    </div>
                {/each}
            </div>
        {/if}

        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="areas tw-p-4 tw-rounded-2xl tw-flex tw-flex-row tw-justify-around tw-items-center tw-cursor-pointer"
            on:click={toggleAreaList}
        >
            <img class="tw-w-10 tw-h-auto tw-mr-2 tw-pointer-events-none" src={AreaToolImg} alt="link icon" />
            {#if $areasListFiltered.size > 0}
                <span class="tw-pointer-events-none"
                    >{$areasListFiltered.size}
                    {$LL.mapEditor.explorer.areasFound($areasListFiltered.size > 1)}</span
                >
                {#if areaListActive}
                    <ChevronDownIcon class="tw-pointer-events-none" size="32" />
                {:else}
                    <ChevronUpIcon class="tw-pointer-events-none" size="32" />
                {/if}
            {:else}
                <p class="tw-m-0">{$LL.mapEditor.explorer.noAreasFound()}</p>
            {/if}
        </div>
        {#if areaListActive && $areasListFiltered.size > 0}
            <div class="area-items tw-p-4 tw-flex tw-flex-col">
                {#if $areasListFiltered.size > 0}
                    {#each [...$areasListFiltered] as [key, area] (key)}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            id={key}
                            on:mouseenter={() => highlightArea(area)}
                            on:mouseleave={() => unhighlightArea(area)}
                            on:click={() => mapExplorationObjectSelectedStore.set(area)}
                            class="item tw-p-4 tw-rounded-2xl tw-flex tw-flex-row tw-justify-around tw-items-center tw-cursor-pointer"
                        >
                            <img
                                class="tw-w-10 tw-h-auto tw-mr-2 tw-pointer-events-none"
                                src={AreaToolImg}
                                alt="link icon"
                            />
                            <span
                                class="tw-pointer-events-none tw-w-32"
                                class:tw-italic={!area.getAreaData().name || area.getAreaData().name == ""}
                                class:tw-font-bold={area.getAreaData().name && area.getAreaData().name != ""}
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
</style>

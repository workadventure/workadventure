<script lang="ts">
    import { writable } from "svelte/store";
    import { ChevronDownIcon } from "svelte-feather-icons";
    import { LL } from "../../../i18n/i18n-svelte";
    import visioSvg from "../images/loupe.svg";
    import ExplorerImg from "../images/explorer.svg";
    import audioSvg from "../images/audio-white.svg";
    import AreaToolImg from "../images/icon-tool-area.png";
    import EntityToolImg from "../images/icon-tool-entity.svg";
    import { mapExplorationEntitiesStore, mapEditorVisibilityStore, mapExplorationObjectSelectedStore } from "../../Stores/MapEditorStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { Entity } from "../../Phaser/ECS/Entity";
    import AddPropertyButton from "./PropertyEditor/AddPropertyButton.svelte";

    let filter = "";
    let selectFilters = writable<Array<string>>(new Array<string>());

    function onChangeFilter() {
        console.log("filter changed", filter);
    }
    function hideSideBar() {
        mapEditorVisibilityStore.set(false);
    }
    function addFilter(filterName: string) {
        selectFilters.update((filters) => {
            if (filters.includes(filterName)) {
                return filters.filter((f) => f !== filterName);
            }
            return [...filters, filterName];
        });
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
        gameManager.getCurrentGameScene().markDirty();
    }
    function unhighlightEntity(entity: Entity) {
        // Don't unhighlight if the entity is selected
        if($mapExplorationObjectSelectedStore == entity) return;

        entity.setPointedToEditColor(0x000000);
        gameManager.getCurrentGameScene().markDirty();
    }
</script>

<div class="tw-flex tw-flex-col">
    <div class="header-container">
        <h2 class="tw-text-l tw-text-center">{$LL.mapEditor.sideBar.exploreTheRoom()}</h2>
    </div>
    <div class="tw-flex tw-flex-col tw-justify-center">
        <div class="tw-flex tw-flex-wrap tw-justify-center tw-items-center">
            <div class="properties-buttons tw-flex tw-flex-row tw-z-10">
                <button
                    class="add-property-button tooltip tw-p-4 tw-flex tw-justify-center tw-items-center"
                    on:click={hideSideBar}
                >
                    <div class="tw-w-10 tw-h-10 tw-flex tw-flex-wrap tw-items-center tw-justify-center">
                        <img
                            draggable="false"
                            class="tw-max-w-[75%] tw-max-h-[75%]"
                            src={ExplorerImg}
                            alt="info icon"
                        />
                    </div>
                    <span class="tooltiptext tw-text-xs">
                        <p class="tw-text-sm tw-mb-2">Exploration mode</p>
                        Explor the room and find entities or area 🗺️
                    </span>
                </button>
            </div>
            <div class="properties-buttons tw-flex tw-flex-row tw-z-10">
                <button class="add-property-button tooltip tw-p-4 tw-flex tw-justify-center tw-items-center">
                    <div class="tw-w-10 tw-h-10 tw-flex tw-flex-wrap tw-items-center tw-justify-center">
                        <img draggable="false" class="tw-max-w-[75%] tw-max-h-[75%]" src={visioSvg} alt="info icon" />
                    </div>
                    <span class="tooltiptext tw-text-xs">
                        <p class="tw-text-sm tw-mb-2">Search entities and areas</p>
                        Find an entity or an area in the room 🧐
                    </span>
                </button>
            </div>
        </div>

        <div class="tw-flex tw-flex-col tw-justify-center tw-items-center">
            <input
                class="filter-input tw-h-8"
                type="search"
                bind:value={filter}
                on:input={onChangeFilter}
                placeholder={$LL.mapEditor.entityEditor.itemPicker.searchPlaceholder()}
            />
        </div>

        <div class="tw-flex tw-flex-row tw-overflow-y-hidden tw-overflow-x-scroll">
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.jitsiProperties.label()}
                descriptionText={$LL.mapEditor.properties.jitsiProperties.description()}
                img={"resources/icons/icon_meeting.png"}
                style={`z-index: 8;${$selectFilters.includes("jitsiRoomProperty") ? "background-color: #4156F6;" : ""}`}
                on:click={() => {
                    addFilter("jitsiRoomProperty");
                }}
            />
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.jitsiProperties.label()}
                descriptionText={$LL.mapEditor.properties.jitsiProperties.description()}
                img={audioSvg}
                style={`z-index: 8;${$selectFilters.includes("playAudio") ? "background-color: #4156F6;" : ""}`}
                on:click={() => {
                    addFilter("playAudio");
                }}
            />
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.jitsiProperties.label()}
                descriptionText={$LL.mapEditor.properties.jitsiProperties.description()}
                img={"resources/icons/icon_link.png"}
                style={`z-index: 8;${$selectFilters.includes("openWebsite") ? "background-color: #4156F6;" : ""}`}
                on:click={() => {
                    addFilter("openWebsite");
                }}
            />
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.speakerMegaphoneProperties.label()}
                descriptionText={$LL.mapEditor.properties.speakerMegaphoneProperties.description()}
                img={"resources/icons/icon_speaker.png"}
                style={`z-index: 8;${$selectFilters.includes("speakerMegaphone") ? "background-color: #4156F6;" : ""}`}
                on:click={() => {
                    addFilter("speakerMegaphone");
                }}
            />
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.listenerMegaphoneProperties.label()}
                descriptionText={$LL.mapEditor.properties.listenerMegaphoneProperties.description()}
                img={"resources/icons/icon_listener.png"}
                style={`z-index: 8;${$selectFilters.includes("listenerMegaphone") ? "background-color: #4156F6;" : ""}`}
                on:click={() => {
                    addFilter("listenerMegaphone");
                }}
            />
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.exitProperties.label()}
                descriptionText={$LL.mapEditor.properties.exitProperties.description()}
                img={"resources/icons/icon_exit.png"}
                style={`z-index: 8;${$selectFilters.includes("exit") ? "background-color: #4156F6;" : ""}`}
                on:click={() => {
                    addFilter("exit");
                }}
            />
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.silentProperty.label()}
                descriptionText={$LL.mapEditor.properties.silentProperty.description()}
                img={"resources/icons/icon_silent.png"}
                style={`z-index: 8;${$selectFilters.includes("silent") ? "background-color: #4156F6;" : ""}`}
                on:click={() => {
                    addFilter("silent");
                }}
            />
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.focusableProperties.label()}
                descriptionText={$LL.mapEditor.properties.focusableProperties.description()}
                img={"resources/icons/icon_focus.png"}
                style={`z-index: 8;${$selectFilters.includes("focusable") ? "background-color: #4156F6;" : ""}`}
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
            {#if $mapExplorationEntitiesStore && $mapExplorationEntitiesStore.size > 0}
                <span class="tw-pointer-events-none">{$mapExplorationEntitiesStore.size} objects found</span>
            {:else}
                <p>No entities found 🙅‍♂️</p>
            {/if}
            <ChevronDownIcon class="tw-pointer-events-none" size="32" />
        </div>

        {#if entityListActive && $mapExplorationEntitiesStore && $mapExplorationEntitiesStore.size > 0}
            <div class="items tw-p-4 tw-flex tw-flex-col">
                {#each [...$mapExplorationEntitiesStore] as [key, entity] (key)}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        id={entity.entityId}
                        on:mouseenter={() => highlightEntity(entity)}
                        on:mouseleave={() => unhighlightEntity(entity)}
                        on:click={() => mapExplorationObjectSelectedStore.set(entity)}
                        class="tw-p-4 tw-rounded-2xl tw-flex tw-flex-row tw-justify-around tw-items-center tw-cursor-pointer"
                    >
                        <img
                            class="tw-w-10 tw-h-auto tw-mr-2 tw-pointer-events-none"
                            src={entity.getPrefab().imagePath}
                            alt="link icon"
                        />
                        <span class="tw-pointer-events-none">{entity.getPrefab().name}</span>
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
            <span class="tw-pointer-events-none">30 areas</span>
            <ChevronDownIcon class="tw-pointer-events-none" size="32" />
        </div>
        {#if areaListActive}
            <div class="items tw-p-4 tw-flex tw-flex-col">
                <div
                    class="tw-p-4 tw-rounded-2xl tw-flex tw-flex-row tw-justify-around tw-items-center tw-cursor-pointer"
                >
                    <img class="tw-w-10 tw-h-auto tw-mr-2 tw-pointer-events-none" src={AreaToolImg} alt="link icon" />
                    <span class="tw-pointer-events-none">Area</span>
                </div>
                <div
                    class="tw-p-4 tw-rounded-2xl tw-flex tw-flex-row tw-justify-around tw-items-center tw-cursor-pointer"
                >
                    <img class="tw-w-10 tw-h-auto tw-mr-2 tw-pointer-events-none" src={AreaToolImg} alt="link icon" />
                    <span class="tw-pointer-events-none">Area</span>
                </div>
                <div
                    class="tw-p-4 tw-rounded-2xl tw-flex tw-flex-row tw-justify-around tw-items-center tw-cursor-pointer"
                >
                    <img class="tw-w-10 tw-h-auto tw-mr-2 tw-pointer-events-none" src={AreaToolImg} alt="link icon" />
                    <span class="tw-pointer-events-none">Area</span>
                </div>
                <div
                    class="tw-p-4 tw-rounded-2xl tw-flex tw-flex-row tw-justify-around tw-items-center tw-cursor-pointer"
                >
                    <img class="tw-w-10 tw-h-auto tw-mr-2 tw-pointer-events-none" src={AreaToolImg} alt="link icon" />
                    <span class="tw-pointer-events-none">Area</span>
                </div>
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .add-property-button {
        --tw-border-opacity: 1;
        border-color: rgb(77 75 103 / var(--tw-border-opacity));
        --tw-bg-opacity: 1;
        background-color: rgb(27 27 41 / var(--tw-bg-opacity));
        --tw-text-opacity: 1;
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
    .items {
        div:hover {
            background-color: #4156f6;
        }
    }
</style>

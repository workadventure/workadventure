<script lang="ts">
    import type { EntityPrefab, EntityPrefabType } from "@workadventure/map-editor";
    import { onDestroy, onMount } from "svelte";
    import { ArrowLeftIcon } from "svelte-feather-icons";
    import { get } from "svelte/store";
    import { LL } from "../../../../i18n/i18n-svelte";
    import {
        mapEditorEntityModeStore,
        mapEditorSelectedEntityPrefabStore,
        mapEditorSelectedEntityStore,
    } from "../../../Stores/MapEditorStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import closeImg from "../../images/close.png";
    import { EntityVariant } from "../../../Phaser/Game/MapEditor/Entities/EntityVariant";
    import ItemUpload from "./ItemUpload.svelte";
    import EntityItem from "./EntityItem.svelte";

    const entitiesCollectionsManager = gameManager.getCurrentGameScene().getEntitiesCollectionsManager();
    const entitiesPrefabsVariants = entitiesCollectionsManager.getEntitiesPrefabsVariantStore();

    let pickedEntity: EntityPrefab | undefined = undefined;
    let pickedEntityVariant: EntityVariant | undefined = undefined;
    let selectedColor: string;

    let filter = "";
    let selectedTag = "";
    let tags = entitiesCollectionsManager.getTags();

    let activeTab: EntityPrefabType = "Default";

    onMount(() => {
        entitiesCollectionsManager.setFilter(filter);
    });

    onDestroy(() => {
        mapEditorSelectedEntityPrefabStoreUnsubscriber();
    });

    function changeActiveTab(newTab: EntityPrefabType) {
        activeTab = newTab;
    }

    const mapEditorSelectedEntityPrefabStoreUnsubscriber = mapEditorSelectedEntityPrefabStore.subscribe(
        (prefab?: EntityPrefab) => {
            pickedEntity = prefab;
        }
    );

    function onPickItem(entityPrefab: EntityPrefab) {
        pickedEntity = entityPrefab;
        mapEditorSelectedEntityPrefabStore.set(entityPrefab);
    }

    function onPickEntityVariant(entityVariant: EntityVariant) {
        pickedEntity = entityVariant.defaultPrefab;
        pickedEntityVariant = entityVariant;
        onColorChange(pickedEntity.color);
    }

    function onColorChange(color: string) {
        selectedColor = color;
        pickedEntity = pickedEntityVariant?.getEntityPrefabsPositions(color)[0];
        mapEditorSelectedEntityPrefabStore.set(pickedEntity);
    }

    function onTagPick() {
        if (selectedTag !== "") {
            filter = selectedTag;
            selectedTag = "";
            onTagChange();
        }
    }

    function onNameChange() {
        entitiesCollectionsManager.setFilter(filter);
    }

    function onTagChange() {
        entitiesCollectionsManager.setFilter(filter, true);
    }

    function backToSelectObject() {
        get(mapEditorSelectedEntityStore)?.delete();
        mapEditorSelectedEntityStore.set(undefined);
        mapEditorSelectedEntityPrefabStore.set(undefined);
        mapEditorEntityModeStore.set("ADD");
        pickedEntityVariant = undefined
    }

    function getCssClassForActiveTab(isActive:boolean){
        if(isActive){
            return "tw-border-0 tw-border-b-2 tw-border-solid tw-border-cyan-300"
        }
        return ""
    }

</script>

<div class="item-picker">
    <h3>{$LL.mapEditor.entityEditor.title()}</h3>
    <div class="item-filter">
        <input
            class="filter-input tw-h-8"
            type="search"
            bind:value={filter}
            on:input={onNameChange}
            placeholder={$LL.mapEditor.entityEditor.itemPicker.searchPlaceholder()}
        />
        <select class="tag-selector tw-h-8" bind:value={selectedTag} on:change={() => onTagPick()}>
            {#each tags as tag (tag)}
                <option>{tag}</option>
            {/each}
        </select>
    </div>
    <div class="item-variations">
        {#if pickedEntityVariant}
            <p
                on:click|preventDefault={backToSelectObject}
                class="tw-flex tw-flex-row tw-items-center tw-text-xs tw-m-0"
            >
                <ArrowLeftIcon size="12" class="tw-cursor-pointer" />
                <span class="tw-ml-1 tw-cursor-pointer"
                    >{$LL.mapEditor.entityEditor.itemPicker.backToSelectObject()}</span
                >
            </p>
            <div class="item-name">
                {pickedEntityVariant.defaultPrefab.name ?? "this entity"}
                <img
                    class="tw-absolute tw-h-2 tw-mx-2 tw-mt-2 tw-cursor-pointer"
                    src={closeImg}
                    alt="Unselect object picked"
                    on:keyup
                    on:click={backToSelectObject}
                />
            </div>
            <div class="item-variant-picker-container tw-h-28">
                {#each pickedEntityVariant.getEntityPrefabsPositions(selectedColor) as item (item.id)}
                    <div
                        class="pickable-item {item.imagePath === pickedEntity?.imagePath ? 'active' : ''}"
                        on:click={() => onPickItem(item)}
                    >
                        <img class="item-image" src={item.imagePath} alt={item.name} />
                    </div>
                {/each}
            </div>
            <div class="color-container">
                {#each pickedEntityVariant.colors as color (color)}
                    <div class={selectedColor === color ? "active" : ""}>
                        <button
                            class="color-selector"
                            style="background-color: {color};"
                            on:click={() => onColorChange(color)}
                        />
                    </div>
                {/each}
            </div>
        {:else}
            <div class="item-name">{$LL.mapEditor.entityEditor.selectObject()}</div>
            <div class="item-variant-picker-container tw-h-28" />
        {/if}
    </div>
    <div class="tw-flex tw-flex-col tw-overflow-auto tw-gap-4">
        <div class="tw-flex tw-min-w-full tw-justify-around">
            <div class={getCssClassForActiveTab(activeTab === "Default")}>
            <button
                on:click={() => changeActiveTab("Default")}>Defaults</button
            >
            </div>
            <div class={getCssClassForActiveTab(activeTab === "Custom")}>
            <button
                on:click={() => changeActiveTab("Custom")}>Customs</button
            >
            </div>
        </div>
        <div class="item-picker-container">
            {#each $entitiesPrefabsVariants as entityPrefabVariant (entityPrefabVariant.id)}
                {#if entityPrefabVariant.defaultPrefab.type === activeTab}
                    <EntityItem entityVariant={entityPrefabVariant} isActive={entityPrefabVariant.defaultPrefab.name === pickedEntity?.name} onPickEntityVariant={onPickEntityVariant} />
                {/if}
            {/each}
        </div>
        <ItemUpload />
    </div>
</div>

<style lang="scss">
    .item-picker {
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        align-content: center;
        .item-filter {
            .filter-input {
                max-width: 90%;
                margin-bottom: 0;
            }
            .tag-selector {
                max-width: 10%;
                margin-bottom: 0;
                position: absolute;
                overflow-y: auto;
            }
        }
        .item-variations {
            margin-top: 10px;
            margin-bottom: 30px;
            .item-name {
                font-weight: bold;
            }
        }
        .item-picker-container,
        .item-variant-picker-container {
            display: flex;
            justify-content: center;
            width: 19em;
            max-height: 80vh;
            padding: 0.5em;
            display: flex;
            flex-wrap: wrap;
            overflow-y: auto;
            pointer-events: auto;
            .pickable-item {
                flex: 0 0 4em;
                height: 4em;
                display: flex;
                margin: 0 0.25rem;
                cursor: pointer;
                * {
                    cursor: pointer;
                }
                .item-image {
                    margin: auto;
                    max-width: 3.6em;
                    max-height: 3.6em;
                }
            }
            .pickable-item:hover {
                border-radius: 0.8em;
                border: 0.2rem solid white;
            }
            .pickable-item.active {
                border-radius: 0.8em;
                border: 0.2rem solid yellow;
            }
        }
        .item-variant-picker-container {
            overflow-y: hidden;
            height: 5em;
            min-height: 80px;
        }
        .color-container {
            display: flex;
            flex-wrap: wrap;
            div {
                .color-selector {
                    border-radius: 1em;
                    border: 0.1rem solid black;
                    max-width: 1em;
                }
            }
            .active {
                background-color: yellow;
                padding: 0.05em;
                border-radius: 0.5em;
            }
        }
        div {
            margin: auto;
            width: fit-content;
        }
    }
</style>

<script lang="ts">
    import type { EntityPrefab } from "@workadventure/map-editor";
    import { onDestroy, onMount } from "svelte";
    import { ArrowLeftIcon } from "svelte-feather-icons";
    import { get } from "svelte/store";
    import { LL } from "../../../i18n/i18n-svelte";
    import {
        mapEditorEntityModeStore,
        mapEditorSelectedEntityPrefabStore,
        mapEditorSelectedEntityStore,
    } from "../../Stores/MapEditorStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import closeImg from "../images/close.png";

    const entitiesCollectionsManager = gameManager.getCurrentGameScene().getEntitiesCollectionsManager();

    let pickedItem: EntityPrefab | undefined = undefined;
    let pickedVariant: EntityPrefab | undefined = undefined;
    let currentColor: string;

    let rootItem: EntityPrefab[] = []; //A sample of each object
    let itemVariants: EntityPrefab[] = [];
    let currentVariants: EntityPrefab[] = [];
    let variantColors: string[] = [];

    let filter = "";

    let selectedTag = "";

    let tags = entitiesCollectionsManager.getTags();

    onMount(() => {
        entitiesCollectionsManager.setFilter(filter);
        updateVisiblePrefabs();
    });

    onDestroy(() => {
        mapEditorSelectedEntityPrefabStoreUnsubscriber();
    });

    const mapEditorSelectedEntityPrefabStoreUnsubscriber = mapEditorSelectedEntityPrefabStore.subscribe(
        (prefab?: EntityPrefab) => {
            pickedItem = prefab;
        }
    );

    function onPickItemVariant(variant: EntityPrefab) {
        pickedVariant = variant;
        mapEditorSelectedEntityPrefabStore.set(pickedVariant);
    }

    function onPickItem(item: EntityPrefab) {
        pickedItem = item;
        if (!pickedItem) {
            return;
        }
        itemVariants = entitiesCollectionsManager
            .getEntitiesPrefabs()
            .filter(
                (item: EntityPrefab) =>
                    item.name === pickedItem?.name && item.collectionName === pickedItem?.collectionName
            );
        itemVariants = itemVariants.sort(
            (a, b) =>
                a.direction.localeCompare(b.direction) +
                a.color.localeCompare(b.color) * 10 +
                (a.color === pickedItem?.color ? -100 : 0) +
                (b.color === pickedItem?.color ? 100 : 0)
        );
        let variantColorSet = new Set<string>();
        itemVariants.forEach((item) => variantColorSet.add(item.color));
        variantColors = [...variantColorSet].sort();
        onColorChange(pickedItem.color);
    }

    function onColorChange(color: string) {
        currentColor = color;
        currentVariants = itemVariants.filter((item) => item.color === color);
        if (pickedVariant != undefined) {
            pickedVariant = currentVariants.find((item) => item.direction === pickedVariant?.direction);
        } else {
            pickedVariant = currentVariants.find((item) => item.direction === pickedItem?.direction);
        }
        if (pickedVariant === undefined) {
            pickedVariant = currentVariants[0];
        }
        mapEditorSelectedEntityPrefabStore.set(pickedVariant);
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
        updateVisiblePrefabs();
    }

    function onTagChange() {
        entitiesCollectionsManager.setFilter(filter, true);
        updateVisiblePrefabs();
    }

    function updateVisiblePrefabs() {
        const prefabs = entitiesCollectionsManager.getEntitiesPrefabs();
        let tags = new Set<string>();
        let uniqId = new Set<string>();
        rootItem = [];
        for (let entityPrefab of prefabs) {
            entityPrefab.tags.forEach((v: string) => tags.add(v));
            if (!uniqId.has(`${entityPrefab.collectionName}:${entityPrefab.name}`)) {
                uniqId.add(`${entityPrefab.collectionName}:${entityPrefab.name}`);
                rootItem.push(entityPrefab);
            }
        }

        if (pickedItem && !rootItem.includes(pickedItem) && rootItem.length != 0) {
            //if the item is not available due to filtering, we change it
            onPickItem(rootItem[0]);
        }
    }

    function backToSelectObject() {
        get(mapEditorSelectedEntityStore)?.delete();
        mapEditorSelectedEntityStore.set(undefined);
        mapEditorSelectedEntityPrefabStore.set(undefined);
        mapEditorEntityModeStore.set("ADD");
    }
</script>

<div class="item-picker">
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
        {#if pickedItem}
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
                {pickedItem?.name ?? "this entity"}
                <img
                    class="tw-absolute tw-h-2 tw-mx-2 tw-mt-2 tw-cursor-pointer"
                    src={closeImg}
                    alt="Unselect object picked"
                    on:keyup
                    on:click={backToSelectObject}
                />
            </div>
            <div class="item-variant-picker-container tw-h-28">
                {#each currentVariants as item (item.id)}
                    <div
                        class="pickable-item {item.imagePath === pickedVariant?.imagePath ? 'active' : ''}"
                        on:click={() => onPickItemVariant(item)}
                    >
                        <img class="item-image" src={item.imagePath} alt={item.name} />
                    </div>
                {/each}
            </div>
            <div class="color-container">
                {#each variantColors as color (color)}
                    <div class={currentColor === color ? "active" : ""}>
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
    <div class="item-picker-container">
        {#each rootItem as item (item.id)}
            <div class="pickable-item {item.id === pickedItem?.id ? 'active' : ''}" on:click={() => onPickItem(item)}>
                <img class="item-image" src={item.imagePath} alt={item.name} />
            </div>
        {/each}
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

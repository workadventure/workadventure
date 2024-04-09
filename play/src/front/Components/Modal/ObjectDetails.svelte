<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber, writable } from "svelte/store";
    import {
        AreaDataPropertiesKeys,
        EntityDataPropertiesKeys,
        OpenWebsiteTypePropertiesKeys,
    } from "@workadventure/map-editor";
    import { fly } from "svelte/transition";
    import { mapEditorModeStore, mapExplorationObjectSelectedStore } from "../../Stores/MapEditorStore";
    import { Entity } from "../../Phaser/ECS/Entity";
    import { AreaPreview } from "../../Phaser/Components/MapEditor/AreaPreview";
    import AreaToolImg from "../images/icon-tool-area.png";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import AddPropertyButtonWrapper from "../MapEditor/PropertyEditor/AddPropertyButtonWrapper.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";

    // Create type for component AddPropertyButton
    type AddPropertyButtonType = {
        property: AreaDataPropertiesKeys | EntityDataPropertiesKeys;
        subProperty?: OpenWebsiteTypePropertiesKeys;
    };

    let iconProperties = writable<Map<string, AddPropertyButtonType>>(new Map());
    let holdEntity: Entity | AreaPreview | undefined;
    let mapExplorationObjectSelectedStoreSubscription: Unsubscriber;
    let description: string | undefined;

    onMount(() => {
        if ($mapExplorationObjectSelectedStore instanceof Entity) {
            description = $mapExplorationObjectSelectedStore.description;
            $mapExplorationObjectSelectedStore?.setPointedToEditColor(0xf9e82d);
        }
        if ($mapExplorationObjectSelectedStore instanceof AreaPreview) {
            description = $mapExplorationObjectSelectedStore.description;
            $mapExplorationObjectSelectedStore?.setStrokeStyle(2, 0xf9e82d);
        }

        initPropertyComponents();

        // Make sure that if the user click on another object, the previous one is not selected anymore
        holdEntity = $mapExplorationObjectSelectedStore;
        mapExplorationObjectSelectedStoreSubscription = mapExplorationObjectSelectedStore.subscribe((value) => {
            if (holdEntity instanceof Entity) holdEntity.setPointedToEditColor(0x000000);
            if (holdEntity instanceof AreaPreview) holdEntity.setStrokeStyle(2, 0x000000);
            holdEntity = value;
            if (value instanceof Entity) value.setPointedToEditColor(0xf9e82d);
            if (value instanceof AreaPreview) value.setStrokeStyle(2, 0xf9e82d);

            initPropertyComponents();
        });
    });
    onDestroy(() => {
        if (mapExplorationObjectSelectedStoreSubscription) mapExplorationObjectSelectedStoreSubscription();
        if ($mapExplorationObjectSelectedStore instanceof Entity)
            $mapExplorationObjectSelectedStore.setPointedToEditColor(0x000000);
        if ($mapExplorationObjectSelectedStore instanceof AreaPreview)
            $mapExplorationObjectSelectedStore.setStrokeStyle(2, 0x000000);
        if (holdEntity instanceof Entity) holdEntity.setPointedToEditColor(0x000000);
        if (holdEntity instanceof AreaPreview) holdEntity.setStrokeStyle(2, 0x000000);

        cleanPropertyComponents();
    });

    function cleanPropertyComponents() {
        iconProperties.set(new Map());
    }

    function initPropertyComponents() {
        cleanPropertyComponents();
        // Create the properties buttons for the selected object
        let newIconProperties = new Map<string, AddPropertyButtonType>();
        if ($mapExplorationObjectSelectedStore instanceof Entity) {
            for (const value of $mapExplorationObjectSelectedStore.getProperties()) {
                newIconProperties.set(value.id, { property: value.type as EntityDataPropertiesKeys });
            }
        }

        if ($mapExplorationObjectSelectedStore instanceof AreaPreview) {
            for (const value of $mapExplorationObjectSelectedStore.getAreaData().properties.values()) {
                newIconProperties.set(value.id, { property: value.type });
            }
        }
        iconProperties.set(newIconProperties);
    }

    function close() {
        if ($mapExplorationObjectSelectedStore instanceof Entity)
            $mapExplorationObjectSelectedStore.setPointedToEditColor(0x000000);
        if ($mapExplorationObjectSelectedStore instanceof AreaPreview)
            $mapExplorationObjectSelectedStore.setStrokeStyle(2, 0x000000);
        if (holdEntity instanceof Entity) holdEntity.setPointedToEditColor(0x000000);
        if (holdEntity instanceof AreaPreview) holdEntity.setStrokeStyle(2, 0x000000);
        mapExplorationObjectSelectedStore.set(undefined);
    }
    function goTo() {
        if ($mapExplorationObjectSelectedStore) {
            // Move to the selected entity or area
            gameManager
                .getCurrentGameScene()
                .moveTo(
                    {
                        x: $mapExplorationObjectSelectedStore.x,
                        y: $mapExplorationObjectSelectedStore.y,
                    },
                    true
                )
                .catch((error) => console.warn(error));
            gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(undefined);

            // Close map editor to walk on the entity or zone
            analyticsClient.toggleMapEditor(!$mapEditorModeStore);
            mapEditorModeStore.switchMode(!$mapEditorModeStore);

            // Close the modal
            mapExplorationObjectSelectedStore.set(undefined);
        }
    }
</script>

<div class="object-menu tw-min-h-fit tw-rounded-3xl tw-overflow-visible" transition:fly={{ x: 1000, duration: 500 }}>
    {#if $mapExplorationObjectSelectedStore instanceof Entity}
        <div class="tw-p-8 tw-flex tw-flex-col tw-justify-center tw-items-center">
            {#if $mapExplorationObjectSelectedStore?.getEntityData().name}
                <h1 class="tw-p-2">{$mapExplorationObjectSelectedStore?.getEntityData().name.toUpperCase()}</h1>
            {:else}
                <h1 class="tw-p-2 tw-font-bold tw-text-3xl">
                    {$mapExplorationObjectSelectedStore?.getPrefab().name.toUpperCase()}
                </h1>
            {/if}
            <img
                src={$mapExplorationObjectSelectedStore?.getPrefab().imagePath}
                alt="Object"
                class="tw-w-32 tw-h-32 tw-mb-4 tw-object-contain"
            />
            <p class="tw-p-0 tw-m-0">
                {description ?? $LL.mapEditor.explorer.noDescriptionFound()}
            </p>
        </div>
        <div class="tw-flex tw-flew-wrap tw-justify-center">
            {#each [...$iconProperties.entries()] as [key, { property, subProperty }] (key)}
                <AddPropertyButtonWrapper {property} {subProperty} />
            {/each}
        </div>
        <div
            class="tw-flex tw-flex-row tw-justify-evenly tw-items-center tw-bg-dark-purple tw-w-full tw-p-2 tw-rounded-b-3xl"
        >
            <button class="tw-bg-dark-purple tw-p-4" on:click={close}>Fermer</button>
            <button class="light tw-p-4" on:click={goTo}>
                {$LL.mapEditor.explorer.details.moveToEntity({
                    name: $mapExplorationObjectSelectedStore?.getPrefab().name.toUpperCase(),
                })}
            </button>
        </div>
    {:else if $mapExplorationObjectSelectedStore instanceof AreaPreview}
        <div class="tw-p-8 tw-flex tw-flex-col tw-justify-center tw-items-center">
            {#if $mapExplorationObjectSelectedStore.getAreaData().name}
                <h1 class="tw-p-2 tw-font-bold tw-text-3xl">
                    {$mapExplorationObjectSelectedStore.getAreaData().name.toUpperCase()}
                </h1>
            {/if}
            <img src={AreaToolImg} alt="Object" class="tw-w-32 tw-h-32 tw-mb-4" />
            <p class="tw-p-0 tw-m-0">
                {description ?? $LL.mapEditor.explorer.noDescriptionFound()}
            </p>
        </div>
        <div class="tw-flex tw-flew-wrap tw-justify-center">
            {#each [...$iconProperties.entries()] as [key, { property, subProperty }] (key)}
                <AddPropertyButtonWrapper {property} {subProperty} />
            {/each}
        </div>
        <div
            class="tw-flex tw-flex-row tw-justify-evenly tw-items-center tw-bg-dark-purple tw-w-full tw-p-2 tw-rounded-b-3xl"
        >
            <button class="tw-bg-dark-purple tw-p-4" on:click={close}>
                {$LL.mapEditor.explorer.details.close()}
            </button>
            <button class="light tw-p-4" on:click={goTo}>
                {$LL.mapEditor.explorer.details.moveToArea({
                    name: $mapExplorationObjectSelectedStore.getAreaData().name.toUpperCase(),
                })}
            </button>
        </div>
    {/if}
</div>

<style lang="scss">
    .object-menu {
        position: absolute;
        width: 668px;
        height: max-content !important;
        z-index: 425;
        word-break: break-all;
        pointer-events: auto;
        color: whitesmoke;
        background-color: #1b2a41d9;
        backdrop-filter: blur(40px);
        top: 15rem;
        left: calc(50% - 334px);
    }
</style>

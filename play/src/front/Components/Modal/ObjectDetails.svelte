<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber, writable } from "svelte/store";
    import {
        AreaDataPropertiesKeys,
        AreaDataProperty,
        EntityDataPropertiesKeys,
        EntityDataProperty,
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
    import { warningMessageStore } from "../../Stores/ErrorStore";

    // Create type for component AddPropertyButton
    type AddPropertyButtonType = {
        property: AreaDataPropertiesKeys | EntityDataPropertiesKeys;
        subProperty?: string;
    };

    let iconProperties = writable<Map<string, AddPropertyButtonType>>(new Map());
    let oldEntity: Entity | AreaPreview | undefined;
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
        oldEntity = $mapExplorationObjectSelectedStore;
        mapExplorationObjectSelectedStoreSubscription = mapExplorationObjectSelectedStore.subscribe((value) => {
            if (oldEntity instanceof Entity) oldEntity.setPointedToEditColor(0x000000);
            if (oldEntity instanceof AreaPreview) oldEntity.setStrokeStyle(2, 0x000000);
            oldEntity = value;
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
        if (oldEntity instanceof Entity) oldEntity.setPointedToEditColor(0x000000);
        if (oldEntity instanceof AreaPreview) oldEntity.setStrokeStyle(2, 0x000000);

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
                newIconProperties.set(value.id, createPropertyData(value));
            }
        }

        if ($mapExplorationObjectSelectedStore instanceof AreaPreview) {
            for (const value of $mapExplorationObjectSelectedStore.getAreaData().properties.values()) {
                newIconProperties.set(value.id, createPropertyData(value));
            }
        }
        iconProperties.set(newIconProperties);
    }

    function createPropertyData(value: EntityDataProperty | AreaDataProperty): AddPropertyButtonType {
        const property: AddPropertyButtonType = {
            property: value.type as EntityDataPropertiesKeys,
            subProperty: undefined,
        };
        if (value.type === "openWebsite" && value.application !== undefined) {
            property.subProperty = value.application;
        }
        return property;
    }

    function close() {
        if ($mapExplorationObjectSelectedStore instanceof Entity)
            $mapExplorationObjectSelectedStore.setPointedToEditColor(0x000000);
        if ($mapExplorationObjectSelectedStore instanceof AreaPreview)
            $mapExplorationObjectSelectedStore.setStrokeStyle(2, 0x000000);
        if (oldEntity instanceof Entity) oldEntity.setPointedToEditColor(0x000000);
        if (oldEntity instanceof AreaPreview) oldEntity.setStrokeStyle(2, 0x000000);
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
                .catch((error) => {
                    console.warn("Error while moving to the entity or area", error);
                    warningMessageStore.addWarningMessage($LL.mapEditor.explorer.details.errorMovingToObject(), {
                        closable: true,
                    });
                });
            gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(undefined);

            // Close map editor to walk on the entity or zone
            analyticsClient.toggleMapEditor(!$mapEditorModeStore);
            mapEditorModeStore.switchMode(!$mapEditorModeStore);

            // Close the modal
            mapExplorationObjectSelectedStore.set(undefined);
        }
    }
</script>

<div class="object-menu min-h-fit rounded-3xl overflow-visible" transition:fly={{ x: 1000, duration: 500 }}>
    {#if $mapExplorationObjectSelectedStore instanceof Entity}
        <div class="p-8 flex flex-col justify-center items-center">
            {#if $mapExplorationObjectSelectedStore?.getEntityData().name}
                <h1 class="p-2">{$mapExplorationObjectSelectedStore?.getEntityData().name.toUpperCase()}</h1>
            {:else}
                <h1 class="p-2 font-bold text-3xl">
                    {$mapExplorationObjectSelectedStore?.getPrefab().name.toUpperCase()}
                </h1>
            {/if}
            <img
                src={$mapExplorationObjectSelectedStore?.getPrefab().imagePath}
                alt="Object"
                class="w-32 h-32 mb-4 object-contain"
            />
            <p class="p-0 m-0">
                {description ?? $LL.mapEditor.explorer.noDescriptionFound()}
            </p>
        </div>
        <div class="flex flex-wrap justify-center">
            {#each [...$iconProperties.entries()] as [key, { property, subProperty }] (key)}
                <AddPropertyButtonWrapper {property} {subProperty} />
            {/each}
        </div>
        <div class="flex flex-row justify-evenly items-center bg-dark-purple w-full p-2 rounded-b-3xl">
            <button class="bg-dark-purple p-4" on:click={close}>{$LL.mapEditor.explorer.details.close()}</button>
            <button class="light p-4" on:click={goTo}>
                {$LL.mapEditor.explorer.details.moveToEntity({
                    name: $mapExplorationObjectSelectedStore?.getPrefab().name.toUpperCase(),
                })}
            </button>
        </div>
    {:else if $mapExplorationObjectSelectedStore instanceof AreaPreview}
        <div class="p-8 flex flex-col justify-center items-center">
            {#if $mapExplorationObjectSelectedStore.getAreaData().name}
                <h1 class="p-2 font-bold text-3xl">
                    {$mapExplorationObjectSelectedStore.getAreaData().name.toUpperCase()}
                </h1>
            {/if}
            <img src={AreaToolImg} alt="Object" class="w-32 h-32 mb-4" />
            <p class="p-0 m-0">
                {description ?? $LL.mapEditor.explorer.noDescriptionFound()}
            </p>
        </div>
        <div class="flex flew-wrap justify-center">
            {#each [...$iconProperties.entries()] as [key, { property, subProperty }] (key)}
                <AddPropertyButtonWrapper {property} {subProperty} />
            {/each}
        </div>
        <div class="flex flex-row justify-evenly items-center bg-dark-purple w-full p-2 rounded-b-3xl">
            <button class="bg-dark-purple p-4" on:click={close}>
                {$LL.mapEditor.explorer.details.close()}
            </button>
            <button class="light p-4" on:click={goTo}>
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
        background-color: #6e1946d9;
        backdrop-filter: blur(40px);
        top: 15rem;
        left: calc(50% - 334px);
    }
</style>

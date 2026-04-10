<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { Unsubscriber } from "svelte/store";
    import { writable } from "svelte/store";
    import type {
        AreaDataPropertiesKeys,
        AreaDataProperty,
        EntityDataPropertiesKeys,
        EntityDataProperty,
    } from "@workadventure/map-editor";
    import { fly } from "svelte/transition";
    import { mapEditorModeStore, mapExplorationObjectSelectedStore } from "../../Stores/MapEditorStore";
    import { Entity } from "../../Phaser/ECS/Entity";
    import { AreaPreview } from "../../Phaser/Components/MapEditor/AreaPreview";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import AddPropertyButtonWrapper from "../MapEditor/PropertyEditor/AddPropertyButtonWrapper.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { warningMessageStore } from "../../Stores/ErrorStore";
    import { WOKA_SPEED } from "../../Enum/EnvironmentVariable";

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
            if (oldEntity instanceof Entity) {
                if (oldEntity.searchable === true) {
                    oldEntity.setPointedToEditColor(0x000000);
                } else {
                    // Remove pointed to edit color
                    oldEntity.removePointedToEditColor();
                }
            }
            if (oldEntity instanceof AreaPreview) oldEntity.setStrokeStyle(2, 0x000000);
            oldEntity = value;
            if (value instanceof Entity) {
                if (value.searchable === true) {
                    value.setPointedToEditColor(0xf9e82d);
                } else {
                    // Remove pointed to edit color
                    value.removePointedToEditColor();
                }
            }
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
        if ($mapExplorationObjectSelectedStore instanceof Entity) {
            if ($mapExplorationObjectSelectedStore.searchable === true) {
                $mapExplorationObjectSelectedStore.setPointedToEditColor(0x000000);
            } else {
                // Remove pointed to edit color
                $mapExplorationObjectSelectedStore.removePointedToEditColor();
            }
        }
        if ($mapExplorationObjectSelectedStore instanceof AreaPreview)
            $mapExplorationObjectSelectedStore.setStrokeStyle(2, 0x000000);
        if (oldEntity instanceof Entity) {
            if (oldEntity.searchable === true) {
                oldEntity.setPointedToEditColor(0x000000);
            } else {
                // Remove pointed to edit color
                oldEntity.removePointedToEditColor();
            }
        }
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
                    true,
                    WOKA_SPEED * 2.5
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

    $: actionButtonText =
        $mapExplorationObjectSelectedStore instanceof Entity ||
        $mapExplorationObjectSelectedStore instanceof AreaPreview
            ? $mapExplorationObjectSelectedStore.actionButtonLabel
            : "";

    $: objectDisplayName = (() => {
        if ($mapExplorationObjectSelectedStore instanceof Entity) {
            const name = $mapExplorationObjectSelectedStore.getEntityData().name;
            if (name != undefined && name != "") return name;
            return $mapExplorationObjectSelectedStore.getPrefab().name;
        }
        if ($mapExplorationObjectSelectedStore instanceof AreaPreview) {
            const name = $mapExplorationObjectSelectedStore.getAreaData().name;
            if (name != undefined && name != "") return name;
            return $mapExplorationObjectSelectedStore.nameFromProperties;
        }
        return "";
    })();
</script>

<div class="absolute bottom-0 w-full h-fit flex flex-row justify-center">
    <div
        class="object-menu min-h-fit rounded-3xl overflow-visible max-w-full w-full md:min-w-[360px] md:w-fit mx-1"
        transition:fly={{ y: 1000, duration: 500 }}
    >
        {#if $mapExplorationObjectSelectedStore instanceof Entity}
            <div class="p-8 flex flex-col justify-center items-center">
                <h1 class="p-2">{objectDisplayName.toUpperCase()}</h1>
                <img
                    src={$mapExplorationObjectSelectedStore?.getPrefab().imagePath}
                    id={$mapExplorationObjectSelectedStore.entityId}
                    alt="Object"
                    class="w-32 h-32 mb-4 object-contain"
                    draggable="false"
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
            <div class="buttons-wrapper flex items-center justify-center p-2 space-x-2 bg-contrast pointer-events-auto">
                <div class="flex flex-row justify-center w-full gap-2">
                    <button class="btn btn-outline w-full hover:bg-contrast-600/50" on:click={close}
                        >{$LL.mapEditor.explorer.details.close()}
                    </button>
                    <button class="btn btn-secondary w-full whitespace-nowrap" on:click={goTo}>
                        {actionButtonText}
                    </button>
                </div>
            </div>
        {:else if $mapExplorationObjectSelectedStore instanceof AreaPreview}
            <div class="p-8 flex flex-col justify-center items-center">
                <h1 class="p-2 font-bold text-3xl">
                    {objectDisplayName.toUpperCase()}
                </h1>
                <p class="p-0 m-0">
                    {description ?? $LL.mapEditor.explorer.noDescriptionFound()}
                </p>
            </div>
            <div class="flex flew-wrap justify-center">
                {#each [...$iconProperties.entries()] as [key, { property, subProperty }] (key)}
                    <AddPropertyButtonWrapper {property} {subProperty} />
                {/each}
            </div>
            <div class="buttons-wrapper flex items-center justify-center p-2 space-x-2 bg-contrast pointer-events-auto">
                <div class="flex flex-row justify-center w-full gap-2">
                    <button class="btn btn-outline w-full hover:bg-contrast-600/50" on:click={close}>
                        {$LL.mapEditor.explorer.details.close()}
                    </button>
                    <button class="btn btn-secondary w-full whitespace-nowrap" on:click={goTo}>
                        {actionButtonText}
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .object-menu {
        height: max-content !important;
        z-index: 2000;
        word-break: break-all;
        pointer-events: auto;
        color: whitesmoke;
        background-color: #1b2a41d9;
        backdrop-filter: blur(40px);
        bottom: 0;
        right: 0;
        left: 0;
        overflow: hidden;
        margin-bottom: 2rem;
    }
</style>

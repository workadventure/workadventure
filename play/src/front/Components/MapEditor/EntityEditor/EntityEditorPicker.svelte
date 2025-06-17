<script lang="ts">
    import type { EntityPrefab } from "@workadventure/map-editor";
    import { onDestroy } from "svelte";
    import { get } from "svelte/store";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { EntityVariant } from "../../../Phaser/Game/MapEditor/Entities/EntityVariant";
    import {
        mapEditorDeleteCustomEntityEventStore,
        mapEditorEntityModeStore,
        mapEditorModifyCustomEntityEventStore,
        mapEditorSelectedEntityPrefabStore,
        mapEditorSelectedEntityStore,
        SelectableTag,
        selectCategoryStore,
    } from "../../../Stores/MapEditorStore";
    import Input from "../../Input/Input.svelte";
    import ButtonClose from "../../Input/ButtonClose.svelte";
    import CustomEntityEditionForm from "./CustomEntityEditionForm/CustomEntityEditionForm.svelte";
    import EntitiesGrid from "./EntitiesGrid.svelte";
    import EntityImage from "./EntityItem/EntityImage.svelte";
    import EntityVariantColorPicker from "./EntityItem/EntityVariantColorPicker.svelte";
    import EntityVariantPositionPicker from "./EntityItem/EntityVariantPositionPicker.svelte";
    import EntityUpload from "./EntityUpload/EntityUpload.svelte";
    import TagListItem from "./TagListItem.svelte";
    import { IconChevronLeft, IconPencil } from "@wa-icons";

    const entitiesCollectionsManager = gameManager.getCurrentGameScene().getEntitiesCollectionsManager();
    const entitiesPrefabsVariants = entitiesCollectionsManager.getEntitiesPrefabsVariantStore();

    const userIsAdmin = gameManager.getCurrentGameScene().connection?.isAdmin();
    const userIsEditor = gameManager.getCurrentGameScene().connection?.hasTag("editor");

    let pickedEntity: EntityPrefab | undefined = undefined;
    let pickedEntityVariant: EntityVariant | undefined = undefined;
    let selectedColor: string;

    let searchTerm = "";

    const mapEditorSelectedEntityPrefabStoreUnsubscriber = mapEditorSelectedEntityPrefabStore.subscribe(
        (prefab?: EntityPrefab) => {
            pickedEntity = prefab;
        }
    );

    const entitiesPrefabsVariantStoreUnsubscriber = entitiesCollectionsManager
        .getEntitiesPrefabsVariantStore()
        .subscribe((entitiesPrefabsVariants) => {
            if (pickedEntityVariant) {
                pickedEntityVariant = entitiesPrefabsVariants.find(
                    (entityPrefabVariant) => pickedEntityVariant?.id === entityPrefabVariant.id
                );
                pickedEntity = pickedEntityVariant?.defaultPrefab;
            }
        });

    function removeEntity(id: string) {
        mapEditorDeleteCustomEntityEventStore.set({ id });
        clearEntitySelection();
        setIsEditingCustomEntity(false);
    }

    function saveCustomEntityModifications(customEntity: EntityPrefab) {
        mapEditorModifyCustomEntityEventStore.set({
            ...customEntity,
        });
        setIsEditingCustomEntity(false);
    }

    function onPickItem(entityPrefab: EntityPrefab) {
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

    function onSelectedTag(tag: string) {
        selectCategoryStore.set(tag);
    }

    function displayTagListAndClearCurrentSelection() {
        get(mapEditorSelectedEntityStore)?.delete();
        mapEditorEntityModeStore.set("ADD");
        clearEntitySelection();
        selectCategoryStore.set(undefined);
        searchTerm = "";
        setIsEditingCustomEntity(false);
    }

    function clearEntitySelection() {
        pickedEntityVariant = undefined;
        pickedEntity = undefined;
        mapEditorSelectedEntityStore.set(undefined);
        mapEditorSelectedEntityPrefabStore.set(undefined);
    }

    let isEditingCustomEntity = false;
    function setIsEditingCustomEntity(isEditing: boolean) {
        isEditingCustomEntity = isEditing;
    }

    function getEntitiesPrefabsVariantsGroupedByTagWithCustomFirst(entitiesPrefabsVariants: EntityVariant[]): {
        [tag: string]: EntityVariant[];
    } {
        const entitiesPrefabsVariantsGroupedByTag = entitiesPrefabsVariants.reduce(
            (groupByTag: { [tag: string]: EntityVariant[] }, entityPrefabVariant) => {
                const { tags } = entityPrefabVariant.defaultPrefab;
                tags.forEach((tag) => {
                    groupByTag[tag] = groupByTag[tag] ?? [];
                    groupByTag[tag].push(entityPrefabVariant);
                });
                return groupByTag;
            },
            {}
        );
        const customEntitiesPrefabsVariants = {
            Custom: entitiesPrefabsVariants.filter(
                (entityPrefabVariant) => entityPrefabVariant.defaultPrefab.type === "Custom"
            ),
        };
        return {
            ...customEntitiesPrefabsVariants,
            ...Object.fromEntries(Object.entries(entitiesPrefabsVariantsGroupedByTag).sort()),
        };
    }

    function getEntitiesPrefabsVariantsFilteredByTag(
        entitiesPrefabsVariants: EntityVariant[],
        tag: SelectableTag,
        searchTerm: string
    ) {
        if (tag === undefined) {
            return entitiesPrefabsVariants.filter(
                (entityPrefabVariant) =>
                    entityPrefabVariant.defaultPrefab.tags
                        .join(",")
                        .toLocaleLowerCase()
                        .indexOf(searchTerm.toLocaleLowerCase()) != -1 ||
                    entityPrefabVariant.defaultPrefab.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if ($selectCategoryStore === "Custom") {
            return entitiesPrefabsVariants.filter(
                (entityPrefabVariant) =>
                    entityPrefabVariant.defaultPrefab.type === "Custom" &&
                    entityPrefabVariant.defaultPrefab.name.toLowerCase().includes(searchTerm)
            );
        }
        return entitiesPrefabsVariants.filter(
            (entityPrefabVariant) =>
                entityPrefabVariant.defaultPrefab.tags.includes(tag) &&
                entityPrefabVariant.defaultPrefab.name.toLowerCase().includes(searchTerm)
        );
    }

    onDestroy(() => {
        mapEditorSelectedEntityPrefabStoreUnsubscriber();
        entitiesPrefabsVariantStoreUnsubscriber();
    });
</script>

<div class="flex flex-col flex-1 overflow-auto gap-2">
    <div class="flex flex-col gap-2">
        <div>
            {#if $selectCategoryStore === undefined}
                <p class="text-[22px] m-0">{$LL.mapEditor.entityEditor.header.title()}</p>
                <p class="m-0 opacity-50">{$LL.mapEditor.entityEditor.header.description()}</p>
            {:else}
                <div class="flex flex-row items-center gap-4">
                    <button
                        class="p-2 rounded-full flex flex-row items-center hover:bg-white/10"
                        data-testid="clearCurrentSelection"
                        on:click={displayTagListAndClearCurrentSelection}
                    >
                        <IconChevronLeft />{$LL.mapEditor.entityEditor.buttons.back()}
                    </button>
                </div>
            {/if}
        </div>
        <div class="flex *:w-full">
            <Input
                rounded
                bind:value={searchTerm}
                placeholder={$LL.mapEditor.entityEditor.itemPicker.searchPlaceholder()}
            />
            <!--            <input-->
            <!--                class="flex-1 h-8 !border-solid !rounded-2xl !border-gray-400 !placeholder-gray-400"-->
            <!--                type="search"-->
            <!--                bind:value={searchTerm}-->
            <!--                placeholder={$LL.mapEditor.entityEditor.itemPicker.searchPlaceholder()}-->
            <!--            />-->
        </div>
    </div>
    <div class="flex-1 overflow-auto">
        {#if $selectCategoryStore === undefined && searchTerm === ""}
            <ul class="list-none !p-0 min-w-full">
                {#each Object.entries(getEntitiesPrefabsVariantsGroupedByTagWithCustomFirst($entitiesPrefabsVariants)) as [tag, entitiesPrefabsVariants] (tag)}
                    <TagListItem
                        on:onSelectedTag={(event) => {
                            onSelectedTag(event.detail);
                        }}
                        {tag}
                        {entitiesPrefabsVariants}
                    />
                {/each}
            </ul>
        {:else}
            {#if pickedEntityVariant && pickedEntity}
                <div
                    class="relative flex flex-row gap-2 items-center justify-center border-b-blue-50 p-4 mb-2 min-h-[200px] bg-white/10 rounded-2xl w-full"
                >
                    {#if isEditingCustomEntity}
                        <CustomEntityEditionForm
                            customEntity={pickedEntity}
                            on:closeForm={() => {
                                setIsEditingCustomEntity(false);
                            }}
                            on:removeEntity={({ detail: { entityId } }) => {
                                removeEntity(entityId);
                            }}
                            on:applyEntityModifications={({ detail: customModifiedEntity }) =>
                                saveCustomEntityModifications(customModifiedEntity)}
                        />
                    {:else}
                        <EntityImage
                            classNames="h-16 w-[64px] object-contain rounded"
                            imageSource={pickedEntity.imagePath}
                            imageAlt={pickedEntity.name}
                        />
                        <div>
                            <p class="m-0"><b>{pickedEntityVariant.defaultPrefab.name}</b></p>
                            <EntityVariantColorPicker
                                colors={pickedEntityVariant.colors}
                                {selectedColor}
                                {onColorChange}
                            />
                            <EntityVariantPositionPicker
                                entityPrefabsPositions={pickedEntityVariant.getEntityPrefabsPositions(selectedColor)}
                                selectedEntity={pickedEntity}
                                {onPickItem}
                            />
                        </div>
                        {#if pickedEntity.type === "Custom"}
                            <button
                                class="btn btn-secondary"
                                data-testid="editEntity"
                                on:click={() => setIsEditingCustomEntity(true)}
                                ><IconPencil font-size={16} />{$LL.mapEditor.entityEditor.buttons.editEntity()}</button
                            >
                        {/if}
                        <div class="absolute top-1 right-1 p-1">
                            <ButtonClose
                                on:click={clearEntitySelection}
                                dataTestId="clearEntitySelection"
                                size="sm"
                                bgColor="bg-white/30"
                                hoverColor="bg-white/40"
                            />
                        </div>
                        <!-- <button
                            class="self-start absolute top-1 right-1"
                            data-testid="clearEntitySelection"
                            on:click={clearEntitySelection}><IconDeselect font-size={20} /></button
                        > -->
                    {/if}
                </div>
            {/if}
            {#if !isEditingCustomEntity}
                <div class="flex flex-col gap-2">
                    {#if $selectCategoryStore}
                        <span class="font-bold text-lg">
                            {$selectCategoryStore}
                        </span>
                    {/if}
                    <EntitiesGrid
                        entityPrefabVariants={getEntitiesPrefabsVariantsFilteredByTag(
                            $entitiesPrefabsVariants,
                            $selectCategoryStore,
                            searchTerm
                        )}
                        onSelectEntity={onPickEntityVariant}
                        currentSelectedEntityId={pickedEntity?.id}
                    />
                </div>
            {/if}
        {/if}
    </div>
    {#if pickedEntity === undefined && (userIsAdmin || userIsEditor)}
        <EntityUpload />
    {/if}
</div>

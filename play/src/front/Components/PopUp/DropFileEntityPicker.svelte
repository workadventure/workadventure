<script lang="ts">
    import type { EntityPrefab } from "@workadventure/map-editor";
    import type { Readable } from "svelte/store";
    import LL from "../../../i18n/i18n-svelte";
    import type { EntityVariant } from "../../Phaser/Game/MapEditor/Entities/EntityVariant";
    import EntityItem from "../MapEditor/EntityEditor/EntityItem/EntityItem.svelte";
    import Input from "../Input/Input.svelte";
    import EntityToolImg from "../images/icon-tool-entity.svg";
    import { IconSearch } from "@wa-icons";

    interface Props {
        entitiesPrefabsVariants: Readable<EntityVariant[]>;
        onselect?: (entity: EntityPrefab) => void;
    }

    let { entitiesPrefabsVariants, onselect }: Props = $props();

    let searchTerm = $state("book");
    let pickedEntity: EntityPrefab | undefined = undefined;
    let currentSelectedEntityId: string | undefined = $state(undefined);

    function getFilteredEntities(entities: EntityVariant[], search: string) {
        if (!search) return entities.slice(0, 9);
        return entities
            .filter(
                (entityVariant) =>
                    entityVariant.defaultPrefab.name.toLowerCase().includes(search.toLowerCase()) ||
                    entityVariant.defaultPrefab.tags.join(",").toLowerCase().includes(search.toLowerCase()),
            )
            .slice(0, 9);
    }

    function onSelectEntity(entityVariant: EntityVariant) {
        pickedEntity = entityVariant.defaultPrefab;
        currentSelectedEntityId = entityVariant.defaultPrefab.id;
        onselect?.(pickedEntity);
    }
</script>

<div class="flex flex-col gap-2 my-2">
    <div class="flex justify-center items-center my-2">
        <img class="w-6 mr-1" src={EntityToolImg} alt="Start icon" draggable="false" />
        <span class="font-semibold">{$LL.mapEditor.entityEditor.header.choose()}</span>
    </div>

    <Input bind:value={searchTerm} placeholder={$LL.mapEditor.entityEditor.itemPicker.searchPlaceholder()}>
        {#snippet inputAppend()}
            <span>
                <IconSearch />
            </span>
        {/snippet}
    </Input>

    <div class="grid grid-cols-[repeat(auto-fit,minmax(64px,3.6em))] gap-2 justify-center">
        {#each getFilteredEntities($entitiesPrefabsVariants, searchTerm) as entityVariant (entityVariant.id)}
            <EntityItem
                onselectentity={onSelectEntity}
                {entityVariant}
                isActive={entityVariant.defaultPrefab.id === currentSelectedEntityId}
            />
        {/each}
    </div>
</div>

<script lang="ts">
    import { EntityVariant } from "../../../Phaser/Game/MapEditor/Entities/EntityVariant";
    import EntityItem from "./EntityItem/EntityItem.svelte";

    export let entityPrefabVariants:EntityVariant[];
    export let onSelectEntity:(entityVariant:EntityVariant)=>void
    export let currentSelectedEntityName:string|undefined

</script>

<div class="tw-grid tw-grid-cols-[repeat(auto-fit,minmax(64px,1fr))] tw-gap-2">
    {#each entityPrefabVariants as entityPrefabVariant (entityPrefabVariant.id)}
        <EntityItem
            on:selectEntity={(event) => onSelectEntity(event.detail)}
            entityVariant={entityPrefabVariant}
            isActive={entityPrefabVariant.defaultPrefab.name === currentSelectedEntityName}
        />
    {/each}
</div>

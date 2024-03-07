<script lang="ts">
    import { IconPhotoOff } from "@tabler/icons-svelte";
    import { EntityVariant } from "../../../Phaser/Game/MapEditor/Entities/EntityVariant";
    import LL from "../../../../i18n/i18n-svelte";
    import EntityItem from "./EntityItem/EntityItem.svelte";

    export let entityPrefabVariants: EntityVariant[];
    export let onSelectEntity: (entityVariant: EntityVariant) => void;
    export let currentSelectedEntityId: string | undefined;
</script>

{#if entityPrefabVariants.length === 0}
    <div class="tw-flex tw-flex-col tw-items-center tw-text-gray-500">
        <IconPhotoOff />
        <p>{$LL.mapEditor.entityEditor.noImage()}</p>
    </div>
{:else}
    <div class="tw-grid tw-grid-cols-[repeat(auto-fit,minmax(64px,3.6em))] tw-gap-2 tw-justify-center">
        {#each entityPrefabVariants as entityPrefabVariant (entityPrefabVariant.defaultPrefab.id)}
            <EntityItem
                on:selectEntity={(event) => onSelectEntity(event.detail)}
                entityVariant={entityPrefabVariant}
                isActive={entityPrefabVariant.defaultPrefab.id === currentSelectedEntityId}
            />
        {/each}
    </div>
{/if}

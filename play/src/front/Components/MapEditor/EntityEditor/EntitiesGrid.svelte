<script lang="ts">
    import { EntityVariant } from "../../../Phaser/Game/MapEditor/Entities/EntityVariant";
    import EntityItem from "./EntityItem/EntityItem.svelte";
    import { IconPhotoOff } from "@tabler/icons-svelte";
    import LL from "../../../../i18n/i18n-svelte";

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
    <div class="tw-grid tw-grid-cols-[repeat(auto-fit,minmax(64px,1fr))] tw-gap-2">
        {#each entityPrefabVariants as entityPrefabVariant}
            <EntityItem
                on:selectEntity={(event) => onSelectEntity(event.detail)}
                entityVariant={entityPrefabVariant}
                isActive={entityPrefabVariant.defaultPrefab.id === currentSelectedEntityId}
            />
        {/each}
    </div>
{/if}

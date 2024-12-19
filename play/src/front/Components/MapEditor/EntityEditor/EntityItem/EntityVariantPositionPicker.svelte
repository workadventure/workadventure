<script lang="ts">
    import { EntityPrefab } from "@workadventure/map-editor";

    export let entityPrefabsPositions: EntityPrefab[];
    export let selectedEntity: EntityPrefab;

    export let onPickItem: (entity: EntityPrefab) => void;
</script>

{#if entityPrefabsPositions.length > 1}
    <p class="m-0 text-xxs">Positions</p>
    <div class="flex flex-row gap-2">
        {#each entityPrefabsPositions as item (item.id)}
            <div class="hover:cursor-pointer" on:click={() => onPickItem(item)}>
                <img
                    class={`hover:cursor-pointer item-image max-w-[32px] ${
                        item.imagePath === selectedEntity?.imagePath ? "border-solid border-yellow-400 rounded-sm" : ""
                    }`}
                    src={item.imagePath}
                    alt={item.name}
                />
            </div>
        {/each}
    </div>
{/if}

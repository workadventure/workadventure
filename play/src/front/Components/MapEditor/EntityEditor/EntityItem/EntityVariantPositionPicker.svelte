<script lang="ts">
    import { EntityPrefab } from "@workadventure/map-editor";

    export let entityPrefabsPositions: EntityPrefab[];
    export let selectedEntity: EntityPrefab;

    export let onPickItem: (entity: EntityPrefab) => void;
</script>

{#if entityPrefabsPositions.length > 1}
    <p class="tw-m-0 tw-text-xxs">Positions</p>
    <div class="tw-flex tw-flex-row tw-gap-2">
        {#each entityPrefabsPositions as item (item.id)}
            <div class="hover:tw-cursor-pointer" on:click={() => onPickItem(item)}>
                <img
                    class={`hover:tw-cursor-pointer item-image tw-max-w-[32px] ${
                        item.imagePath === selectedEntity?.imagePath
                            ? "tw-border-solid tw-border-yellow-400 tw-rounded-sm"
                            : ""
                    }`}
                    src={item.imagePath}
                    alt={item.name}
                />
            </div>
        {/each}
    </div>
{/if}

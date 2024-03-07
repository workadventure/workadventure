<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { IconChevronRight } from "@tabler/icons-svelte";
    import { EntityVariant } from "../../../Phaser/Game/MapEditor/Entities/EntityVariant";
    import LL from "../../../../i18n/i18n-svelte";
    import EntityImage from "./EntityItem/EntityImage.svelte";

    export let tag: string;
    export let entitiesPrefabsVariants: EntityVariant[];

    const dispatch = createEventDispatcher();
</script>

{#if entitiesPrefabsVariants.length !== 0}
    <li
        class="tw-min-w-full tw-bg-white tw-bg-opacity-10 tw-rounded-xl tw-mt-2 hover:tw-bg-opacity-100 hover:tw-text-dark hover:!tw-cursor-pointer"
        on:click={() => dispatch("onSelectedTag", tag)}
    >
        <div class="entities-tag-list-item-grid tw-p-2">
            <div class="asset">
                <EntityImage
                    classNames="tw-w-[32px] tw-h-[32px] tw-object-contain"
                    imageSource={entitiesPrefabsVariants[0].defaultPrefab.imagePath}
                    imageAlt={entitiesPrefabsVariants[0].defaultPrefab.name}
                />
            </div>
            <div class="tag">
                <p class="tw-m-0">{`${tag.charAt(0).toUpperCase()}${tag.slice(1)}`}</p>
            </div>
            <div class="entitiesCount">
                {entitiesPrefabsVariants.length}
            </div>
            <div class="object">{$LL.mapEditor.entityEditor.images(entitiesPrefabsVariants.length)}</div>
            <div class="chevronRight">
                <IconChevronRight />
            </div>
        </div>
    </li>
{/if}

<style lang="scss">
    .entities-tag-list-item-grid {
        display: grid;
        column-gap: 6px;
        grid-template-areas: "asset tag tag . chevronRight" "asset entitiesCount object . chevronRight ";
        grid-template-columns: 32px auto 1fr 1fr 1fr;
    }

    .asset {
        grid-area: asset;
        align-self: center;
        justify-self: center;
    }

    .tag {
        grid-area: tag;
    }

    .chevronRight {
        grid-area: chevronRight;
        align-self: center;
        justify-self: end;
    }

    .entitiesCount {
        grid-area: entitiesCount;
        font-size: 12px;
        border: 1px solid white;
        align-self: center;
        justify-self: center;
        padding: 0 4px;
        border-radius: 4px;
    }

    .entities-tag-list-item-grid:hover .entitiesCount {
        border: 1px solid black;
    }

    .object {
        grid-area: object;
        opacity: 50%;
        font-size: 12px;
        align-self: center;
    }
</style>

<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import { mapExplorationObjectSelectedStore } from "../../Stores/MapEditorStore";
    import { Entity } from "../../Phaser/ECS/Entity";
    import { AreaPreview } from "../../Phaser/Components/MapEditor/AreaPreview";
    import AreaToolImg from "../images/icon-tool-area.png";
    import { gameManager } from "../../Phaser/Game/GameManager";

    let holdEntity: Entity | AreaPreview | undefined;
    let mapExplorationObjectSelectedStoreSubscription: Unsubscriber;

    onMount(() => {
        if ($mapExplorationObjectSelectedStore instanceof Entity)
            $mapExplorationObjectSelectedStore?.setPointedToEditColor(0xf9e82d);
        if ($mapExplorationObjectSelectedStore instanceof AreaPreview)
            $mapExplorationObjectSelectedStore?.setStrokeStyle(2, 0xf9e82d);

        // Make sure that if the user click on another object, the previous one is not selected anymore
        holdEntity = $mapExplorationObjectSelectedStore;
        mapExplorationObjectSelectedStoreSubscription = mapExplorationObjectSelectedStore.subscribe((value) => {
            if (holdEntity instanceof Entity) holdEntity.setPointedToEditColor(0x000000);
            if (holdEntity instanceof AreaPreview) holdEntity.setStrokeStyle(2, 0x000000);
            holdEntity = value;
            if (value instanceof Entity) value.setPointedToEditColor(0xf9e82d);
            if (value instanceof AreaPreview) value.setStrokeStyle(2, 0xf9e82d);
        });
    });
    onDestroy(() => {
        if (mapExplorationObjectSelectedStoreSubscription) mapExplorationObjectSelectedStoreSubscription();
        if ($mapExplorationObjectSelectedStore instanceof Entity)
            $mapExplorationObjectSelectedStore.setPointedToEditColor(0x000000);
        if ($mapExplorationObjectSelectedStore instanceof AreaPreview)
            $mapExplorationObjectSelectedStore.setStrokeStyle(2, 0x000000);
        if (holdEntity instanceof Entity) holdEntity.setPointedToEditColor(0x000000);
        if (holdEntity instanceof AreaPreview) holdEntity.setStrokeStyle(2, 0x000000);
    });

    function close() {
        if ($mapExplorationObjectSelectedStore instanceof Entity)
            $mapExplorationObjectSelectedStore.setPointedToEditColor(0x000000);
        if ($mapExplorationObjectSelectedStore instanceof AreaPreview)
            $mapExplorationObjectSelectedStore.setStrokeStyle(2, 0x000000);
        if (holdEntity instanceof Entity) holdEntity.setPointedToEditColor(0x000000);
        if (holdEntity instanceof AreaPreview) holdEntity.setStrokeStyle(2, 0x000000);
        mapExplorationObjectSelectedStore.set(undefined);
    }
    async function goTo() {
        if ($mapExplorationObjectSelectedStore)
            await gameManager
                .getCurrentGameScene()
                .CurrentPlayer?.setPathToFollow([
                    { x: $mapExplorationObjectSelectedStore.x, y: $mapExplorationObjectSelectedStore.y },
                ]);
    }
</script>

<div class="object-menu tw-rounded-3xl">
    {#if $mapExplorationObjectSelectedStore instanceof Entity}
        <div class="tw-p-8 tw-flex tw-flex-col tw-justify-center tw-items-center">
            {#if $mapExplorationObjectSelectedStore?.getEntityData().name}
                <h1 class="tw-p-2">{$mapExplorationObjectSelectedStore?.getEntityData().name.toUpperCase()}</h1>
            {:else}
                <h1 class="tw-p-2 tw-font-bold tw-text-3xl">
                    {$mapExplorationObjectSelectedStore?.getPrefab().name.toUpperCase()}
                </h1>
            {/if}
            <img
                src={$mapExplorationObjectSelectedStore?.getPrefab().imagePath}
                alt="Object"
                class="tw-w-32 tw-h-32 tw-mb-4"
            />
            <p class="tw-p-0 tw-m-0">
                Illo cupiditate et hic voluptatem et et nulla ea. Non ab aut temporibus. Possimus repellat atque. Aut
                deleniti eveniet et qui molestiae est cumque.
            </p>
        </div>
        <div class="tw-flex tw-flex-row tw-justify-evenly tw-items-center tw-bg-dark-purple tw-w-full tw-p-2">
            <button class="tw-bg-dark-purple tw-p-4" on:click={close}>Fermer</button>
            <button class="light tw-p-4" on:click={goTo}
                >Got the the entity {$mapExplorationObjectSelectedStore?.getPrefab().name.toUpperCase()}</button
            >
        </div>
    {:else if $mapExplorationObjectSelectedStore instanceof AreaPreview}
        <div class="tw-p-8 tw-flex tw-flex-col tw-justify-center tw-items-center">
            {#if $mapExplorationObjectSelectedStore.getAreaData().name}
                <h1 class="tw-p-2 tw-font-bold tw-text-3xl">
                    {$mapExplorationObjectSelectedStore.getAreaData().name.toUpperCase()}
                </h1>
            {/if}
            <img src={AreaToolImg} alt="Object" class="tw-w-32 tw-h-32 tw-mb-4" />
            <p class="tw-p-0 tw-m-0">
                Illo cupiditate et hic voluptatem et et nulla ea. Non ab aut temporibus. Possimus repellat atque. Aut
                deleniti eveniet et qui molestiae est cumque.
            </p>
        </div>
        <div class="tw-flex tw-flex-row tw-justify-evenly tw-items-center tw-bg-dark-purple tw-w-full tw-p-2">
            <button class="tw-bg-dark-purple tw-p-4" on:click={close}>Fermer</button>
            <button class="light tw-p-4" on:click={goTo}
                >Got the the area {$mapExplorationObjectSelectedStore.getAreaData().name.toUpperCase()}</button
            >
        </div>
    {/if}
</div>

<style lang="scss">
    .object-menu {
        position: absolute;
        width: 668px;
        height: max-content !important;
        max-height: 50vh;
        overflow-y: auto;
        z-index: 425;
        word-break: break-all;
        pointer-events: auto;
        color: whitesmoke;
        background-color: #1b2a41d9;
        backdrop-filter: blur(40px);
        top: 15rem;
        left: 50rem;
    }
</style>

<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { mapExplorationObjectSelectedStore } from "../../Stores/MapEditorStore";
    import { Unsubscriber } from "svelte/store";
    import { Entity } from "../../Phaser/ECS/Entity";

    let holdEntity: Entity | undefined;
    let mapExplorationObjectSelectedStoreSubscription: Unsubscriber;

    onMount(() => {
        $mapExplorationObjectSelectedStore?.setPointedToEditColor(0xf9e82d);
        // Make sure that if the user click on another object, the previous one is not selected anymore
        holdEntity = $mapExplorationObjectSelectedStore;
        mapExplorationObjectSelectedStoreSubscription = mapExplorationObjectSelectedStore.subscribe((value) => {
            holdEntity?.setPointedToEditColor(0x000000);
            holdEntity = value;
            value?.setPointedToEditColor(0xf9e82d);
        });
    });
    onDestroy(() => {
        if(mapExplorationObjectSelectedStoreSubscription) mapExplorationObjectSelectedStoreSubscription();
        $mapExplorationObjectSelectedStore?.setPointedToEditColor(0x000000);
        holdEntity?.setPointedToEditColor(0x000000);
    });

    function close(){
        $mapExplorationObjectSelectedStore?.setPointedToEditColor(0x000000);
        holdEntity?.setPointedToEditColor(0x000000);
        mapExplorationObjectSelectedStore.set(undefined);
    }
    function goTo(){
        console.log("Go to the object", $mapExplorationObjectSelectedStore?.x, $mapExplorationObjectSelectedStore?.y);
    }
</script>
<div class="object-menu tw-rounded-3xl">
    <div class="tw-p-8 tw-flex tw-flex-col tw-justify-center tw-items-center">
        {#if $mapExplorationObjectSelectedStore?.getEntityData().name}
            <h1 class="tw-p-2">{$mapExplorationObjectSelectedStore?.getEntityData().name.toUpperCase()}</h1>
        {:else}
            <h1 class="tw-p-2 tw-font-bold tw-text-3xl">{$mapExplorationObjectSelectedStore?.getPrefab().name.toUpperCase()}</h1>
        {/if}
        <img src={$mapExplorationObjectSelectedStore?.getPrefab().imagePath} alt="Object" class="tw-w-32 tw-h-32 tw-mb-4" />
        <p class="tw-p-0 tw-m-0">Illo cupiditate et hic voluptatem et et nulla ea. Non ab aut temporibus. Possimus repellat atque. Aut deleniti eveniet et qui molestiae est cumque.</p>
    </div>
    <div class="tw-flex tw-flex-row tw-justify-evenly tw-items-center tw-bg-dark-purple tw-w-full tw-p-2">
        <button class="tw-bg-dark-purple tw-p-4" on:click={close}>Fermer</button>
        <button class="light tw-p-4" on:click={goTo}>Got the the object {$mapExplorationObjectSelectedStore?.getPrefab().name.toUpperCase()}</button>
    </div>
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
        background-color: #1B2A41d9;
        backdrop-filter: blur(40px);
        top: 15rem;
        left: 50rem;
    }
</style>
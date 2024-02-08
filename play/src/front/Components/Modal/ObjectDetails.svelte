<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber, writable } from "svelte/store";
    import { mapExplorationObjectSelectedStore } from "../../Stores/MapEditorStore";
    import { Entity } from "../../Phaser/ECS/Entity";
    import { AreaPreview } from "../../Phaser/Components/MapEditor/AreaPreview";
    import { LL } from "../../../i18n/i18n-svelte";
    import AreaToolImg from "../images/icon-tool-area.png";
    import audioSvg from "../images/audio-white.svg";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import AddPropertyButton from "../MapEditor/PropertyEditor/AddPropertyButton.svelte";

    // Create type for component AddPropertyButton
    type AddPropertyButtonType = {
        headerText: string;
        descriptionText: string;
        img: string;
        style: string;
    };

    let iconProperties = writable<Map<string, AddPropertyButtonType>>(new Map());
    let holdEntity: Entity | AreaPreview | undefined;
    let mapExplorationObjectSelectedStoreSubscription: Unsubscriber;

    onMount(() => {
        if ($mapExplorationObjectSelectedStore instanceof Entity)
            $mapExplorationObjectSelectedStore?.setPointedToEditColor(0xf9e82d);
        if ($mapExplorationObjectSelectedStore instanceof AreaPreview)
            $mapExplorationObjectSelectedStore?.setStrokeStyle(2, 0xf9e82d);

        initPropertyComponents();

        // Make sure that if the user click on another object, the previous one is not selected anymore
        holdEntity = $mapExplorationObjectSelectedStore;
        mapExplorationObjectSelectedStoreSubscription = mapExplorationObjectSelectedStore.subscribe((value) => {
            if (holdEntity instanceof Entity) holdEntity.setPointedToEditColor(0x000000);
            if (holdEntity instanceof AreaPreview) holdEntity.setStrokeStyle(2, 0x000000);
            holdEntity = value;
            if (value instanceof Entity) value.setPointedToEditColor(0xf9e82d);
            if (value instanceof AreaPreview) value.setStrokeStyle(2, 0xf9e82d);

            initPropertyComponents();
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

        cleanPropertyComponents();
    });

    function cleanPropertyComponents() {
        iconProperties.set(new Map());
    }

    function initPropertyComponents() {
        cleanPropertyComponents();
        // Create the properties buttons for the selected object
        let newIconProperties = new Map<string, AddPropertyButtonType>();
        if ($mapExplorationObjectSelectedStore instanceof Entity) {
            for (const value of $mapExplorationObjectSelectedStore.getProperties()) {
                let addPropertyButton = getAddPropertyButton(value.type);
                if (addPropertyButton) newIconProperties.set(value.id, addPropertyButton);
            }
        }

        if ($mapExplorationObjectSelectedStore instanceof AreaPreview) {
            for (const value of $mapExplorationObjectSelectedStore.getAreaData().properties.values()) {
                let addPropertyButton = getAddPropertyButton(value.type);
                if (addPropertyButton) newIconProperties.set(value.id, addPropertyButton);
            }
        }
        iconProperties.set(newIconProperties);
    }

    function getAddPropertyButton(type: string) {
        let addPropertyButton: AddPropertyButtonType | undefined;
        switch (type) {
            case "jitsiRoomProperty":
                addPropertyButton = {
                    headerText: $LL.mapEditor.properties.jitsiProperties.label(),
                    descriptionText: $LL.mapEditor.properties.jitsiProperties.description(),
                    img: "resources/icons/icon_meeting.png",
                    style: "",
                };
                break;
            case "openWebsite":
                addPropertyButton = {
                    headerText: $LL.mapEditor.properties.linkProperties.label(),
                    descriptionText: $LL.mapEditor.properties.linkProperties.description(),
                    img: "resources/icons/icon_link.png",
                    style: "",
                };
                break;
            case "playAudio":
                addPropertyButton = {
                    headerText: $LL.mapEditor.properties.audioProperties.label(),
                    descriptionText: $LL.mapEditor.properties.audioProperties.description(),
                    img: audioSvg,
                    style: "",
                };
                break;
            case "speakerMegaphone":
                addPropertyButton = {
                    headerText: $LL.mapEditor.properties.speakerMegaphoneProperties.label(),
                    descriptionText: $LL.mapEditor.properties.speakerMegaphoneProperties.description(),
                    img: "resources/icons/icon_speaker.png",
                    style: "",
                };
                break;
            case "listenerMegaphone":
                addPropertyButton = {
                    headerText: $LL.mapEditor.properties.listenerMegaphoneProperties.label(),
                    descriptionText: $LL.mapEditor.properties.listenerMegaphoneProperties.description(),
                    img: "resources/icons/icon_listener.png",
                    style: "",
                };
                break;
            case "exit":
                addPropertyButton = {
                    headerText: $LL.mapEditor.properties.exitProperties.label(),
                    descriptionText: $LL.mapEditor.properties.exitProperties.description(),
                    img: "resources/icons/icon_exit.png",
                    style: "",
                };
                break;
            case "silent":
                addPropertyButton = {
                    headerText: $LL.mapEditor.properties.silentProperty.label(),
                    descriptionText: $LL.mapEditor.properties.silentProperty.description(),
                    img: "resources/icons/icon_silent.png",
                    style: "",
                };
                break;
            case "focusable":
                addPropertyButton = {
                    headerText: $LL.mapEditor.properties.focusableProperties.label(),
                    descriptionText: $LL.mapEditor.properties.focusableProperties.description(),
                    img: "resources/icons/icon_focus.png",
                    style: "",
                };
                break;
        }
        return addPropertyButton;
    }

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
        <div class="tw-flex tw-flew-wrap tw-justify-center">
            {#each [...$iconProperties.entries()] as [key, value] (key)}
                <AddPropertyButton
                    headerText={value.headerText}
                    descriptionText={value.descriptionText}
                    img={value.img}
                    style={value.style}
                />
            {/each}
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
        <div class="tw-flex tw-flew-wrap tw-justify-center">
            {#each [...$iconProperties.entries()] as [key, value] (key)}
                <AddPropertyButton
                    headerText={value.headerText}
                    descriptionText={value.descriptionText}
                    img={value.img}
                    style={value.style}
                />
            {/each}
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

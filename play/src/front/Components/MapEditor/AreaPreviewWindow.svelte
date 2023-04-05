<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import type { AreaData, PredefinedPropertyData } from "@workadventure/map-editor";
    import { onDestroy } from "svelte";
    import { mapEditorSelectedAreaPreviewStore, mapEditorSelectedPropertyStore } from "../../Stores/MapEditorStore";
    import type { AreaPreview } from "../../Phaser/Components/MapEditor/AreaPreview";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import PropertyField from "./PropertyField.svelte";
    import PropertyPreviewSidebar from "./PropertyPreviewSidebar.svelte";

    let areaPreview: AreaPreview | undefined;
    let areaData: AreaData | undefined;
    let mapEditorSelectedAreaPreviewStoreUnsubscriber: Unsubscriber;

    // let propertySilent: boolean;

    const focusablePropertyData: PredefinedPropertyData = {
        name: "Focusable",
        description: "Focus camera on this area. Set zoom margin if needed.",
        turnedOn: false,
        additionalProperties: {
            zoomMargin: 0,
        },
    };

    const gameScene = gameManager.getCurrentGameScene();

    mapEditorSelectedAreaPreviewStoreUnsubscriber = mapEditorSelectedAreaPreviewStore.subscribe((preview) => {
        areaPreview = preview;
        if (preview) {
            areaData = structuredClone(preview.getConfig());

            // focusablePropertyData.turnedOn = areaData.properties["focusable"] as boolean;
            // focusablePropertyData.additionalProperties["zoomMargin"] = areaData.properties["zoomMargin"] as number;

            // propertySilent = areaData.properties["silent"] as boolean;
        }
    });

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeAreaPreviewWindow();
        }
    }

    function closeAreaPreviewWindow() {
        $mapEditorSelectedAreaPreviewStore = undefined;
        $mapEditorSelectedPropertyStore = undefined;
    }

    function sendUpdateAreaCommand() {
        console.log("SEND UPDATE");
        console.log(focusablePropertyData);
        if (!areaData) {
            return;
        }
        // areaData.properties["focusable"] = focusablePropertyData.turnedOn;
        // areaData.properties["silent"] = propertySilent;
        // areaData.properties["zoomMargin"] = focusablePropertyData.additionalProperties["zoomMargin"] as
        //     | number
        //     | undefined;
        gameScene.getMapEditorModeManager().executeCommand({ type: "UpdateAreaCommand", areaObjectConfig: areaData });
    }

    onDestroy(() => {
        if (mapEditorSelectedAreaPreviewStoreUnsubscriber) {
            mapEditorSelectedAreaPreviewStoreUnsubscriber();
        }
    });
</script>

<svelte:window on:keydown={onKeyDown} />

{#if areaPreview && areaData}
    <PropertyPreviewSidebar on:update={sendUpdateAreaCommand} />
    <div class="area-details-window tw-bg-purple/95 tw-rounded">
        <div
            class="area-details-window-name tw-bg-light-purple/40 tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple"
        >
            <h1>{areaData.name}</h1>
            <p>{"Lorem ipsum dolor sit amet, consectetur adipiscing elit."}</p>
        </div>
        <div class="fields">
            <div class="field">
                <p class="blue-title">x:</p>
                <input bind:value={areaData.x} on:change={sendUpdateAreaCommand} type="number" id="x" />
            </div>
            <div class="field">
                <p class="blue-title">y:</p>
                <input bind:value={areaData.y} on:change={sendUpdateAreaCommand} type="number" id="y" />
            </div>
            <div class="field">
                <p class="blue-title">width:</p>
                <input bind:value={areaData.width} on:change={sendUpdateAreaCommand} type="number" id="width" />
            </div>
            <div class="field tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple">
                <p class="blue-title">height:</p>
                <input bind:value={areaData.height} on:change={sendUpdateAreaCommand} type="number" id="height" />
            </div>
            <PropertyField propertyData={focusablePropertyData} on:update={sendUpdateAreaCommand} />
            <!-- <div class="field">
                <p class="blue-title">focusable:</p>
                <input
                    bind:checked={propertyFocusable}
                    on:change={sendUpdateAreaCommand}
                    type="checkbox"
                    id="focusable"
                />
            </div>
            <div class="field">
                <p class="blue-title">zoom margin:</p>
                <input
                    bind:value={propertyZoomMargin}
                    on:change={sendUpdateAreaCommand}
                    type="number"
                    id="zoomMargin"
                />
            </div> -->
            <!-- <div class="field">
                <p class="blue-title">silent:</p>
                <input bind:checked={propertySilent} on:change={sendUpdateAreaCommand} type="checkbox" id="silent" />
            </div> -->
        </div>
        <!-- <div class="actions">
            {#each areaData.properties ?? [] as property}
                <div>{property.name}: {property.value}</div>
            {/each}
        </div> -->
    </div>
{/if}

<style lang="scss">
    .area-details-window {
        margin: auto;
        z-index: 425;
        height: 100%;
        width: fit-content !important;
        pointer-events: auto;
        flex: 1 1 0;

        .fields {
            display: flex;
            flex-direction: column;
        }

        .field {
            align-items: center;
            justify-content: space-between;
            padding-left: 10px;
            padding-right: 10px;
            display: flex;
            flex-direction: row;
        }
    }
</style>

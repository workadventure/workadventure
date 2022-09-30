<script lang="ts">
    import { mapEditorSelectedAreaPreviewStore } from "../../Stores/MapEditorStore";
    import { onDestroy } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import { AreaPreview } from "../../Phaser/Components/MapEditor/AreaPreview";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { ITiledMapRectangleObject } from "@workadventure/map-editor";

    let areaPreview: AreaPreview | undefined;
    let areaData: ITiledMapRectangleObject | undefined;
    let mapEditorSelectedAreaPreviewStoreUnsubscriber: Unsubscriber;

    const gameScene = gameManager.getCurrentGameScene();

    mapEditorSelectedAreaPreviewStoreUnsubscriber = mapEditorSelectedAreaPreviewStore.subscribe((preview) => {
        areaPreview = preview;
        if (preview) {
            areaData = { ...preview.getConfig() };
        }
    });

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeAreaPreviewWindow();
        }
    }

    function closeAreaPreviewWindow() {
        $mapEditorSelectedAreaPreviewStore = undefined;
    }

    function sendUpdateAreaCommand() {
        if (!areaData) {
            return;
        }
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
    <div class="area-details-window tw-bg-purple/95 tw-rounded">
        <h2>{areaData.name}</h2>
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
            <div class="field">
                <p class="blue-title">height:</p>
                <input bind:value={areaData.height} on:change={sendUpdateAreaCommand} type="number" id="height" />
            </div>
            <div class="field">
                <p class="blue-title">focusable:</p>
                <!-- <input bind:value={areaData.properties["focusable"]} on:change={sendUpdateAreaCommand} type="checkbox" id="focusable" /> -->
            </div>
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
        width: 350px !important;
        z-index: 425;

        pointer-events: auto;

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

        h2 {
            text-align: center;
            margin-bottom: 20px;
            // font-family: "Press Start 2P";
        }
    }
</style>

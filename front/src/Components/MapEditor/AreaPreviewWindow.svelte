<script lang="ts">
    import { mapEditorSelectedAreaPreviewStore } from "../../Stores/MapEditorStore";
    import { onDestroy } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import { AreaPreview } from "../../Phaser/Components/MapEditor/AreaPreview";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { ITiledMapRectangleObject } from "@workadventure/map-editor-types";

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

    function updatePreview() {
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
    <div class="area-details-window nes-container is-rounded">
        <button type="button" class="nes-btn is-error close" on:click={closeAreaPreviewWindow}>&times</button>
        <h2>{areaData.name}</h2>
        fields:
        <hr />
        <div class="fields">
            <label for="x">x</label>
            <input bind:value={areaData.x} on:change={updatePreview} type="number" id="x" />
            <label for="x">y</label>
            <input bind:value={areaData.y} on:change={updatePreview} type="number" id="y" />
            <label for="x">width</label>
            <input bind:value={areaData.width} on:change={updatePreview} type="number" id="width" />
            <label for="x">height</label>
            <input bind:value={areaData.height} on:change={updatePreview} type="number" id="height" />
        </div>
        <br />
        properties:
        <hr />
        <div class="actions">
            {#each areaData.properties ?? [] as property}
                <div>{property.name}: {property.value}</div>
            {/each}
        </div>
    </div>
{/if}

<style lang="scss">
    .area-details-window {
        position: absolute;
        left: 30%;
        top: 30%;
        transform: translate(-50%, 0);
        width: 400px !important;
        height: max-content !important;
        max-height: 60vh;
        // margin-top: 100px;
        z-index: 425;

        pointer-events: auto;
        font-family: "Press Start 2P";
        background-color: #333333;
        color: whitesmoke;

        .fields {
            display: flex;
            flex-direction: column;
            // align-items: flex-end;
        }

        h2 {
            text-align: center;
            margin-bottom: 20px;
            font-family: "Press Start 2P";
        }

        .nes-btn.is-error.close {
            position: absolute;
            top: -20px;
            right: -20px;
        }
    }
</style>

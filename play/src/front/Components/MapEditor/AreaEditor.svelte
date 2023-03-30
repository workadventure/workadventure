<script lang="ts">
    import { AreaData } from "@workadventure/map-editor";
    import { onDestroy } from "svelte";
    import {
        mapEditorAreaModeStore,
        onMapEditorInputFocus,
        onMapEditorInputUnfocus,
        mapEditorSelectedAreaPreviewStore,
    } from "../../Stores/MapEditorStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import AreaPropertiesEditor from "./AreaPropertiesEditor.svelte";

    let areaName = "";

    let selectedAreaPreviewUnsubscriber = mapEditorSelectedAreaPreviewStore.subscribe((currentAreaPreview) => {
        if (currentAreaPreview) {
            areaName = currentAreaPreview.getAreaData().name;
        }
    });

    function onUpdate(data: Partial<AreaData>) {
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.updateData(data);
        }
    }

    onDestroy(() => {
        selectedAreaPreviewUnsubscriber();
    });
</script>

{#if $mapEditorAreaModeStore === "ADD"}
    <!-- <AreaPropertiesEditor /> -->
{/if}
{#if $mapEditorAreaModeStore === "EDIT"}
    {#if $mapEditorSelectedAreaPreviewStore !== undefined}
        <div class="area-basic-data">
            <label for="areaName">{$LL.mapEditor.areaEditor.nameLabel()}</label>
            <input
                id="areaName"
                type="text"
                bind:value={areaName}
                on:change={() => onUpdate({ name: areaName })}
                on:focus={onMapEditorInputFocus}
                on:blur={onMapEditorInputUnfocus}
            />
        </div>
        <AreaPropertiesEditor />
    {/if}
{/if}

<style lang="scss">
    .area-basic-data {
        display: flex;
        align-items: center;

        label {
            min-width: fit-content;
            margin-right: 0.5em;
        }
        input {
            flex-grow: 1;
            min-width: 0;
        }
        * {
            margin-bottom: 0;
        }
    }
</style>

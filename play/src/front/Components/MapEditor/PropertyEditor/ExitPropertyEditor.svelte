<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { ExitPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    export let property: ExitPropertyData;
    const dispatch = createEventDispatcher();
    let mapsUrl: string[] = [];
    let startAreas: string[] = [];
    function onValueChange() {
        dispatch("change");
    }

    const connection = gameManager.getCurrentGameScene().connection;

    async function fetchMaps(): Promise<void> {
        if (connection) {
            mapsUrl = await connection
                .queryMapsList()
                .then((maps) => maps.mapsUrl)
                .catch((e) => {
                    console.error(e);
                    return [];
                });
        }
    }

    async function fetchStartAreasName(): Promise<void> {
        if (connection && property.url) {
            startAreas = await connection
                .queryStartAreasList(property.url)
                .then((areas) => areas.startAreas)
                .catch((e) => {
                    console.error(e);
                    return [];
                });
        }
    }

    onMount(() => {
        void fetchMaps();
        void fetchStartAreasName();
    });
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        <img
            class="tw-w-6 tw-mr-1"
            src="resources/icons/icon_exit.png"
            alt={$LL.mapEditor.properties.exitProperties.description()}
        />
        {$LL.mapEditor.properties.exitProperties.label()}
    </span>
    <span slot="content">
        <div>
            <label for="startAreaSelector">{$LL.mapEditor.properties.exitProperties.exitMap()}</label>
            <select
                id="startAreaSelector"
                class="tw-w-full"
                bind:value={property.url}
                on:change={() => {
                    onValueChange();
                    void fetchStartAreasName();
                }}
            >
                {#each mapsUrl as map}
                    <option value={map}>{map}</option>
                {/each}
            </select>
        </div>
        {#if property.url}
            <div>
                <label for="startAreaNameSelector"
                    >{$LL.mapEditor.properties.exitProperties.exitMapStartAreaName()}</label
                >
                <select
                    id="startAreaNameSelector"
                    class="tw-w-full"
                    bind:value={property.areaName}
                    on:change={onValueChange}
                    on:blur={onValueChange}
                >
                    {#each startAreas as areaName}
                        <option value={areaName}>{areaName}</option>
                    {/each}
                    {#if startAreas.length === 0}
                        <option value={""} selected>No start area found</option>
                    {/if}
                </select>
            </div>
        {/if}
    </span>
</PropertyEditorBase>

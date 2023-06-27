<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { ExitPropertyData, WAMFileFormat } from "@workadventure/map-editor";
    import axios from "axios";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { MAP_STORAGE_PATH_PREFIX } from "../../../Enum/EnvironmentVariable";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    export let property: ExitPropertyData;
    const dispatch = createEventDispatcher();
    let mapsUrl: string[] = [];
    let startAreas: string[] = [];
    function onValueChange() {
        dispatch("change");
    }

    const connection = gameManager.getCurrentGameScene().connection;
    const wamUrl = new URL(gameManager.getCurrentGameScene().wamUrlFile || "");

    const baseUrl = MAP_STORAGE_PATH_PREFIX ? `${wamUrl.origin}${MAP_STORAGE_PATH_PREFIX}` : wamUrl.origin;

    async function fetchMaps(): Promise<void> {
        const response = await axios.get(`${baseUrl}/maps`);
        if (response.data && response.data.maps) {
            mapsUrl = Object.keys(response.data.maps);
        }
    }

    async function fetchStartAreasName(): Promise<void> {
        if (connection && property.url) {
            const response = await axios.get(`${baseUrl}/${property.url}`);
            const result = WAMFileFormat.safeParse(response.data);
            if (result.success && result.data && result.data.areas) {
                startAreas = result.data.areas
                    .filter((area) => area.properties.find((property) => property.type === "start"))
                    .map((area) => area.name);
            }
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
            <label for="exitMapSelector">{$LL.mapEditor.properties.exitProperties.exitMap()}</label>
            <select
                id="exitMapSelector"
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

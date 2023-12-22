<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { ExitPropertyData, WAMFileFormat } from "@workadventure/map-editor";
    import axios from "axios";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    export let property: ExitPropertyData;
    const dispatch = createEventDispatcher();
    // Key: room URL
    let mapsUrl = new Map<
        string,
        {
            name: string;
            wamUrl: string | undefined;
        }
    >();
    let startAreas: string[] = [];
    function onValueChange() {
        dispatch("change");
    }

    const connection = gameManager.getCurrentGameScene().connection;

    async function fetchMaps(): Promise<void> {
        const response = await gameManager.getCurrentGameScene().connection?.queryRoomsFromSameWorld();

        if (response) {
            for (const room of response) {
                //const url = new URL(room.url);
                mapsUrl.set(room.roomUrl, {
                    name: room.name,
                    wamUrl: room.wamUrl,
                });
            }
            mapsUrl = mapsUrl;
        }
    }

    async function fetchStartAreasName(): Promise<void> {
        if (connection && property.url) {
            const wamUrl = mapsUrl.get(property.url)?.wamUrl;

            if (!wamUrl) {
                return;
            }

            const response = await axios.get(wamUrl);
            const result = WAMFileFormat.safeParse(response.data);
            if (result.success && result.data && result.data.areas) {
                startAreas = result.data.areas
                    .filter((area) => area.properties.find((property) => property.type === "start"))
                    .map((area) => area.name);
            }
        }
    }

    onMount(() => {
        fetchMaps()
            .then(() => {
                return fetchStartAreasName();
            })
            .catch((e) => console.error(e));
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
                    fetchStartAreasName().catch((e) => console.error(e));
                }}
            >
                {#each [...mapsUrl.entries()] as map (map[0])}
                    <option value={map[0]}>{map[1].name}</option>
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
                    {#each startAreas as areaName (areaName)}
                        <option value={areaName} selected={areaName === property.areaName}>{areaName}</option>
                    {/each}
                    {#if startAreas.length === 0}
                        <option value={""} selected>No start area found</option>
                    {/if}
                </select>
            </div>
        {/if}
    </span>
</PropertyEditorBase>

<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import type { ExitPropertyData } from "@workadventure/map-editor";
    import { WAMFileFormat } from "@workadventure/map-editor";
    import { wamFileMigration } from "@workadventure/map-editor/src/Migrations/WamFileMigration";
    import axios from "axios";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import Select from "../../Input/Select.svelte";
    import { IconDoorOut } from "../../Icons";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: ExitPropertyData;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();
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
        if (property.url == undefined || property.url == "") {
            // Find the first map in the mapsUrl map
            const firstMap = mapsUrl.entries().next().value;
            if (firstMap) {
                property.url = firstMap[0];
                onValueChange();
            }
        }

        if (connection) {
            const wamUrl = mapsUrl.get(property.url)?.wamUrl;

            if (!wamUrl) {
                return;
            }

            const response = await axios.get(wamUrl);
            const result = WAMFileFormat.safeParse(wamFileMigration.migrate(response.data));
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
    <span slot="header" class="flex justify-center items-center">
        <IconDoorOut font-size="18" class="mr-2" />
        {$LL.mapEditor.properties.exit.label()}
    </span>
    <span slot="content">
        <div>
            <Select
                id="exitMapSelector"
                label={$LL.mapEditor.properties.exit.exitMap()}
                bind:value={property.url}
                onChange={(value) => {
                    property.areaName = "";
                    onValueChange();
                    fetchStartAreasName().catch((e) => console.error(e));
                }}
                on:blur={() => {
                    onValueChange();
                    fetchStartAreasName().catch((e) => console.error(e));
                }}
            >
                {#each [...mapsUrl.entries()] as map (map[0])}
                    <option value={map[0]} selected={map[0] === property.url}>{map[1].name}</option>
                {/each}
            </Select>
        </div>
        {#if property.url}
            <div>
                <Select
                    id="startAreaNameSelector"
                    label={$LL.mapEditor.properties.exit.defaultStartArea()}
                    bind:value={property.areaName}
                    onChange={() => {
                        onValueChange();
                        fetchStartAreasName().catch((e) => console.error(e));
                    }}
                    on:blur={() => {
                        onValueChange();
                        fetchStartAreasName().catch((e) => console.error(e));
                    }}
                >
                    <option value="" selected={!property.areaName}
                        >{$LL.mapEditor.properties.exit.defaultStartArea()}</option
                    >
                    {#each startAreas as areaName (areaName)}
                        <option value={areaName} selected={areaName === property.areaName}>{areaName}</option>
                    {/each}
                </Select>
            </div>
        {/if}
    </span>
</PropertyEditorBase>

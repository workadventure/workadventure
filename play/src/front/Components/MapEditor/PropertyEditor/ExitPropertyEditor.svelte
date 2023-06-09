<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { ExitPropertyData } from "@workadventure/map-editor";
    import axios from "axios";
    import { mapFetcher } from "@workadventure/map-editor/src/MapFetcher";
    import { PUSHER_URL } from "../../../Enum/EnvironmentVariable";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { PUBLIC_MAP_STORAGE_URL } from "../../../../pusher/enums/EnvironmentVariable";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: ExitPropertyData;

    const dispatch = createEventDispatcher();

    let mapWamUrl: string;

    function onValueChange() {
        dispatch("change");
    }

    async function getWamUrl() {
        let areasName = new Map<string, string>();
        const response = await axios.get(`${PUSHER_URL}/maps`);
        if (response.data && response.data.maps) {
            for (let wamUrl in response.data.maps) {
                areasName.set(wamUrl, wamUrl);
            }
        }
        return areasName;
    }

    async function getStartAreaNames() {
        let areasName = new Map<string, string>();
        const wamFile = await mapFetcher.fetchWamFile(mapWamUrl, PUBLIC_MAP_STORAGE_URL, undefined);
        wamFile.areas.forEach((area) => {
            area.properties.forEach((property) => {
                if (property.type === "start") {
                    areasName.set(`${wamFile}#`, area.name);
                }
            });
        });
        return areasName;
    }
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
            <select id="startAreaSelector" class="tw-w-full" bind:value={mapWamUrl}>
                {#await getWamUrl()}
                    <option value={""} selected>Loading ...</option>
                {:then startAreaNames}
                    {#each [...startAreaNames] as [url, areaName]}
                        <option value={url}>{areaName}</option>
                    {/each}
                {/await}
            </select>
        </div>
        {#if mapWamUrl}
            <div>
                <label for="startAreaNameSelector"
                    >{$LL.mapEditor.properties.exitProperties.exitMapStartAreaName()}</label
                >
                <select
                    id="startAreaNameSelector"
                    class="tw-w-full"
                    bind:value={property.url}
                    on:change={onValueChange}
                >
                    {#await getStartAreaNames()}
                        <option value={""} selected>Loading ...</option>
                    {:then startAreaNames}
                        {#each [...startAreaNames] as [url, areaName]}
                            <option value={url}>{areaName}</option>
                        {/each}
                    {/await}
                </select>
            </div>
        {/if}
    </span>
</PropertyEditorBase>

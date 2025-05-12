<script lang="ts">
    //import svelteLogo from './assets/svelte.svg'
    //import viteLogo from '/vite.svg'

    import { MapsCacheFileFormat, WAMFileFormat } from "@workadventure/map-editor";
    import { onMount } from "svelte";

    // TODO: not perfect. We should instead get data from an env var.
    const playUrl =
        window.location.protocol +
        "//" +
        window.location.host.replace("map-storage.", "play.").replace("map-storage-", "play-");
    const mapStorageUrl = window.location.protocol + "//" + window.location.host;

    const responsePromise = fetch<MapsCacheFileFormat>("../maps", {
        redirect: "follow",
    }).then(async (response) => {
        if (response.ok) {
            return MapsCacheFileFormat.parse(await response.json());
        } else {
            throw new Error("Error while fetching the maps list: " + response.statusText);
        }
    });

    function addTmj() {
        if (!wamPath.endsWith(".wam")) {
            alert("The WAM path should be a valid non existing file name, ending with '.wam'. For instance: 'map.wam'");
        }

        fetch("../" + wamPath, {
            method: "PUT",
            headers: {
                "Content-type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify({
                version: "1.0.0",
                mapUrl: newTmjUrl,
                entities: {},
                metadata: {},
                entityCollections: [
                    {
                        url: playUrl + "/collections/FurnitureCollection.json",
                        type: "file",
                    },
                    {
                        url: playUrl + "/collections/OfficeCollection.json",
                        type: "file",
                    },
                ],
                areas: [],
            } satisfies WAMFileFormat),
        })
            .then((response) => {
                if (response.ok) {
                    alert("Map added successfully!");
                    closeTmjDialog();
                    window.location.reload();
                } else {
                    alert("Error while adding the map: " + response.statusText);
                }
            })
            .catch((error) => {
                alert("Error while adding the map: " + error);
            });
    }

    let dialog: HTMLDialogElement | null; // Reference to the dialog tag
    onMount(() => {
        dialog = document.getElementById("add-tmj-dialog") as HTMLDialogElement | null;
    });

    function showDialogClick() {
        dialog?.showModal();
    }

    function closeTmjDialog() {
        dialog?.close();
    }

    let newTmjUrl: string = "";
    let wamPath: string = "";
</script>

<main>
    <h1>WorkAdventure MapStorage</h1>

    {#await responsePromise}
        <p>Loading maps list...</p>
    {:then json}
        <h2>Maps list</h2>
        <ul>
            {#each Object.entries(json.maps) as [name, map] (name)}
                <li>
                    <a href={mapStorageUrl + "/" + name} target="_blank">{name}</a>
                    &rarr;
                    <a href={map.mapUrl} target="_blank">{map.mapUrl}</a>
                </li>
            {/each}
        </ul>
    {:catch error}
        <p style="color: red">{error.message}</p>
    {/await}

    <button on:click={showDialogClick}>Add a map (hosted on a remote server)</button>

    <div style="display: flex;">
        <div style="padding: 10px; margin: 20px;">
            <h2>Upload map</h2>
            <p>Use this very simple web interface to upload a map (as a ZIP file).</p>
            <form action="../upload" method="post" enctype="multipart/form-data">
                <label for="file">Select a file to upload:</label><br />
                <input type="file" name="file" id="file" accept=".zip" /><br />
                <label for="directory">Directory:</label><br />
                <input type="text" name="directory" id="directory" value="/" /><br /><br />
                <input type="submit" value="Submit" />
            </form>
        </div>
        <div style="padding: 10px; margin: 20px;">
            <h2>Download map</h2>
            <form action="../download" method="get">
                <label for="directoryDownload">Directory:</label><br />
                <input type="text" name="directory" id="directoryDownload" value="/" /><br /><br />
                <input type="submit" value="Submit" />
            </form>
        </div>
    </div>

    <dialog id="add-tmj-dialog">
        <h1>Add a new map</h1>
        <p>This will create a new room (WAM file) in the map-storage referencing your Tiled map.</p>
        <p>Please provide the full URL to a Tiled map file (<code>.tmj</code> or <code>.json</code> extension)</p>
        <form on:submit|preventDefault={addTmj}>
            <div>
                <label for="wam-map-field">WAM path:</label>
                <input id="wam-map-field" type="text" bind:value={wamPath} placeholder="my-map.wam" />
            </div>
            <div>
                <label for="tiled-map-url-field">Tile map URL:</label>
                <input id="tiled-map-url-field" type="url" bind:value={newTmjUrl} />
            </div>
            <button type="submit">Add</button>
            <button type="button" on:click={closeTmjDialog}>Close</button>
        </form>
    </dialog>
</main>

<style>
</style>

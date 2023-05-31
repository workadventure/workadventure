<script lang="ts">
    //import svelteLogo from './assets/svelte.svg'
    //import viteLogo from '/vite.svg'

    import {MapsCacheFileFormat} from "@workadventure/map-editor";

    const responsePromise = fetch<MapsCacheFileFormat>('../maps', {
        redirect: "follow"
    });
</script>

<main>
    <h1>WorkAdventure MapStorage</h1>

    {#await responsePromise}
        <p>Loading maps list...</p>
    {:then response}
        {#await response.json()}
            <p>Loading maps list...</p>
        {:then json}
            <h2>Maps list</h2>
            <ul>
                {#each Object.entries(json.maps) as [name, map]}
                    <li><a href={map.mapUrl}>{name}</a></li>
                {/each}
            </ul>
        {:catch error}
            <p style="color: red">{error.message}</p>
        {/await}
    {:catch error}
        <p style="color: red">{error.message}</p>
    {/await}


    <div style="display: flex;">
        <div style="padding: 10px; margin: 20px;">
            <h2>Upload map</h2>
            <p>Use this very simple web interface to upload a map (as a ZIP file).</p>
            <form action="../upload" method="post" enctype="multipart/form-data">
                <label for="file">Select a file to upload:</label><br>
                <input type="file" name="file" id="file" accept=".zip"><br>
                <label for="directory">Directory:</label><br>
                <input type="text" name="directory" id="directory" value="/"><br><br>
                <input type="submit" value="Submit">
            </form>
        </div>
        <div style="padding: 10px; margin: 20px;">
            <h2>Download map</h2>
            <form action="../download" method="get">
                <label for="directoryDownload">Directory:</label><br>
                <input type="text" name="directory" id="directoryDownload" value="/"><br><br>
                <input type="submit" value="Submit">
            </form>
        </div>
    </div>
</main>

<style>
    .logo {
        height: 6em;
        padding: 1.5em;
        will-change: filter;
        transition: filter 300ms;
    }
    .logo:hover {
        filter: drop-shadow(0 0 2em #646cffaa);
    }
    .logo.svelte:hover {
        filter: drop-shadow(0 0 2em #ff3e00aa);
    }
    .read-the-docs {
        color: #888;
    }
</style>

<script lang="ts">
    import { onMount } from "svelte";
    import Link from "./Link.svelte";
    import { servers, selectedServer, selectServer, loadServers } from "../store";

    let isDevelopment = false;

    function getServerColor(i: number) {
        const serverColors = ['bg-red-400', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500'];

        return serverColors[i % serverColors.length];
    }

    onMount(async () => {
        await loadServers();
        isDevelopment = await window?.WorkAdventureDesktopApi?.isDevelopment();
    });
</script>

<aside class="flex flex-col bg-gray-700 items-center">
    <div class="flex flex-col mt-4 space-y-4 overflow-y-auto pb-4">
        {#each $servers as server, i}
            <div class="flex flex-col items-center justify-center text-gray-400">
                <div
                    class={`w-12 h-12 rounded-lg flex cursor-pointer text-center items-center justify-center text-light-50 ${getServerColor(i)} ${
                        $selectedServer === server._id ? "" : ""
                    }`}
                    on:click={() => selectServer(server)}
                >
                    {server.name.slice(0, 2).toLocaleUpperCase()}
                </div>
            </div>
        {/each}
        <Link
            to="/server/add"
            class="flex justify-center items-center text-4xl no-underline text-gray-400 cursor-pointer">+</Link
        >
    </div>
    {#if isDevelopment}
        <button class="mt-auto" on:click={() => location.reload()}>Refresh</button>
    {/if}
</aside>

<style>
    aside {
        width: 70px;
    }
</style>

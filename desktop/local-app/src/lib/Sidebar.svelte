<script lang="ts">
    import { onMount } from "svelte";
    import Link from "./Link.svelte";
    import { servers, selectedServer, selectServer, loadServers } from "../store";

    let isDevelopment = false;

    onMount(async () => {
        await loadServers();
        isDevelopment = await window?.WorkAdventureDesktopApi?.isDevelopment();
    });
</script>

<aside class="flex flex-col bg-gray-700 items-center">
    <div class="flex flex-col mt-4 space-y-4">
        {#each $servers as server}
            <div class="flex flex-col items-center justify-center text-gray-400">
                <div
                    class={`w-12 h-12 rounded-lg flex cursor-pointer text-center items-center justify-center bg-yellow-500 text-light-50 ${
                        $selectedServer === server._id ? "" : ""
                    }`}
                    on:click={() => selectServer(server)}
                >
                    {server.name.slice(0, 2)}
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
        /* background-color: #2b2f37; */

        /* color: #62727c;
        border: 1px solid #62727c; */

        /* border-color: #e1e4e8;
        color: #e1e4e8; */
    }
</style>

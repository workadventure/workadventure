<script lang="ts">
    import { onMount } from "svelte";
    import { Link } from "svelte-navigator";

    import { servers, selectedServer, loadServers } from "~/store";
    import CogIcon from "~/assets/nes.icons/cog.svg";
    import { api } from "~/lib/ipc";

    let isDevelopment = false;

    function getServerColor(i: number) {
        const serverColors = [
            "bg-red-400",
            "bg-yellow-500",
            "bg-green-500",
            "bg-blue-500",
            "bg-indigo-500",
            "bg-purple-500",
        ];

        return serverColors[i % serverColors.length];
    }

    $: serverWithSelection = $servers.map((s) => ({ ...s, isSelected: $selectedServer === s._id }));

    onMount(async () => {
        await loadServers();
        isDevelopment = await api.isDevelopment();
    });
</script>

<aside class="flex flex-col bg-gray-700 items-center">
    <div class="flex flex-col mt-4 space-y-4 overflow-y-auto pb-4">
        {#each serverWithSelection as server, i}
            <Link to="/server/{server._id}" class="flex flex-col items-center justify-center ">
                <div
                    class={`w-16 h-16 p-1 rounded-md flex cursor-pointer text-light-50 border-4 border-transparent text-gray-200 hover:text-gray-500`}
                    class:bg-gray-400={server.isSelected}
                >
                    <div
                        class={`flex w-full h-full text-center items-center justify-center rounded-md ${getServerColor(
                            i
                        )}`}
                    >
                        {server.name.slice(0, 2).toLocaleUpperCase()}
                    </div>
                </div>
            </Link>
        {/each}
    </div>
    <Link
        to="/server/add"
        class="flex justify-center items-center text-4xl no-underline text-gray-200 cursor-pointer hover:text-gray-500"
        >+</Link
    >
    <Link to="/settings" class="flex mt-auto mb-4 justify-center items-center text-4xl no-underline cursor-pointer">
        <CogIcon width="30" height="30" class="fill-gray-200 hover:fill-gray-500" />
    </Link>
    {#if isDevelopment}
        <button class="text-8px text-red-500 my-4" on:click={() => location.reload()}>Refresh</button>
    {/if}
</aside>

<style>
    aside {
        width: 80px;
    }
</style>
